#!/usr/bin/env python3
"""
Dev Pipeline Script - farmalux-ecommerce
========================================
Homologación de dev-pipeline.sh a Python.
Herramienta de productividad para el ciclo de desarrollo.

Modos:
    --soft:  Sincronización suave (Smart Migrations). Detecta cambios en modelos y migra.
    --hard:  DESTRUCTIVO. Recrea la BD desde cero y aplica seeds.
    --front: Regenera cliente API (Orval) y tipos.
    --back:  Reinicia backend (si se usa con start.local.py).
    --full:  Reinicio completo.

Uso:
    python dev_pipeline.py [MODO]
"""

import argparse
import logging
import os
import platform
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

# --- Configuración ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("dev_pipeline")

PROJECT_ROOT = Path(__file__).parent.resolve()
VENV_PATH = PROJECT_ROOT / ".venv"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
DATA_DIR = PROJECT_ROOT / "data"

IS_WINDOWS = platform.system().lower() == "windows"
NPM_CMD = "npm.cmd" if IS_WINDOWS else "npm"


def get_venv_python():
    """Retorna el path al python del venv."""
    if IS_WINDOWS:
        return str(VENV_PATH / "Scripts" / "python.exe")
    return str(VENV_PATH / "bin" / "python")


def run_command(cmd, cwd=None, env=None, capture_output=False, check=True):
    """Ejecuta un comando de sistema."""
    cmd_str = " ".join(cmd)
    logger.debug(f"Ejecutando: {cmd_str}")

    try:
        if capture_output:
            result = subprocess.run(
                cmd, cwd=cwd, env=env, check=check, capture_output=True, text=True, encoding="utf-8"
            )
            return result.stdout
        else:
            subprocess.run(cmd, cwd=cwd, env=env, check=check)
            return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Error ejecutando '{cmd_str}': {e}")
        if capture_output:
            logger.error(f"Output: {e.stdout}")
            logger.error(f"Error: {e.stderr}")
        if check:
            sys.exit(1)
        return False


def wait_for_backend(port=8042, timeout=60):
    """Espera a que el backend responda."""
    logger.info(f"⏳ Esperando al backend en puerto {port}...")

    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(f"http://localhost:{port}/docs", timeout=1) as response:
                if response.status == 200:
                    logger.info("✓ Backend operativo.")
                    return True
        except Exception:
            time.sleep(2)
            print(".", end="", flush=True)

    print("")
    logger.error("❌ Timeout esperando al backend.")
    return False


def fix_ownership():
    """Homólogo a fix_ownership, pero en local solo aseguramos permisos de escritura."""
    # En local Windows/Linux user-mode esto suele ser menos crítico que en Docker,
    # pero podemos asegurar que los directorios clave existan.
    pass


def rebuild_schema_hard():
    """Modo HARD: Borra DB, Migra, Seeds."""
    logger.warning(">>> MODO HARD: RESET INTEGRAL DE BASE DE DATOS <<<")
    logger.warning("ESTO BORRARÁ LOS DATOS DE NEGOCIO.")

    # Confirmación
    response = input("¿Estás seguro? (y/n): ")
    if response.lower() != "y":
        sys.exit(0)

    python_exe = get_venv_python()

    # 1. Eliminar DB (Usando seed_data.py --clean logic o manual)
    # Preferimos borrar los archivos manualmente para asegurar estado limpio
    db_dir = DATA_DIR / "database"
    if db_dir.exists():
        for f in db_dir.glob("*.db"):
            try:
                f.unlink()
                logger.info(f"✓ Eliminado: {f.name}")
            except Exception as e:
                logger.error(f"❌ No se pudo eliminar {f.name}: {e}")

    # 2. Alembic Upgrade Head
    logger.info("Aplicando esquema (Alembic upgrade)...")
    run_command([python_exe, "-m", "alembic", "upgrade", "head"], cwd=PROJECT_ROOT)

    # 3. Seeds
    logger.info("Sembrando datos iniciales...")
    seed_script = PROJECT_ROOT / "scripts" / "seed_data.py"
    if seed_script.exists():
        run_command([python_exe, str(seed_script)], cwd=PROJECT_ROOT)
    else:
        logger.warning("⚠️ No se encontró scripts/seed_data.py")

    logger.success("✓ Reset completo finalizado.")


def sync_soft():
    """Modo SOFT: Smart Migrations."""
    logger.info(">>> MODO SOFT: SINCRONIZANDO CAMBIOS <<<")
    python_exe = get_venv_python()

    # 1. Autogenerate con nombre temporal
    migration_name = f"auto_sync_{int(time.time())}"

    logger.info("Detectando cambios (Alembic autogenerate)...")
    # Capturamos output para ver si hubo cambios
    try:
        output = run_command(
            [python_exe, "-m", "alembic", "revision", "--autogenerate", "-m", migration_name],
            cwd=PROJECT_ROOT,
            capture_output=True,
        )

        # Analizamos output (Alembic no devuelve error code 1 si no hay cambios, pero imprime mensajes)
        # Una forma más segura es ver si se creó un archivo en alembic/versions
        # Pero por ahora confiamos en el upgrade.

        # En versiones modernas, si no hay cambios, a veces no crea archivo o dice "No changes detected"
        if "No changes in schema detected" in output:
            logger.info("✓ Sin cambios pendientes en modelos.")
        else:
            logger.info("✓ Migración generada. Aplicando...")
            run_command([python_exe, "-m", "alembic", "upgrade", "head"], cwd=PROJECT_ROOT)

    except Exception as e:
        logger.error(f"Error en autogenerate: {e}")
        sys.exit(1)


def regenerate_frontend():
    """Regenera cliente Orval."""
    logger.info(">>> GENERANDO CLIENTE FRONTEND (ORVAL) <<<")

    # Necesitamos backend arriba para el swagger json?
    # dev-pipeline.sh espera backend.

    backend_port = int(os.environ.get("BACKEND_PORT", 8042))
    if not wait_for_backend(port=backend_port, timeout=10):
        logger.warning("⚠️ Backend no disponible. Intentando lectura de archivo local si existe o fallando.")

    logger.info("Ejecutando generación de API...")
    run_command([NPM_CMD, "run", "generate:api"], cwd=FRONTEND_DIR)
    logger.info("✓ Cliente actualizado.")


def restart_backend():
    """Reinicia backend (si usamos start.local.py, esto implica matar y re-lanzar)."""
    # Como start.local.py tiene un lock file, podemos usar stop.local.py y luego start.local.py --backend-only
    logger.info(">>> REINICIANDO BACKEND <<<")
    python_exe = get_venv_python()

    stop_script = PROJECT_ROOT / "stop.local.py"
    # start_script = PROJECT_ROOT / "start.local.py" # Unused

    run_command([python_exe, str(stop_script)], cwd=PROJECT_ROOT)
    # Start en modo detached? dev-pipeline suele ser una utilidad que se corre PUNTUALMENTE,
    # no reemplaza al proceso principal.
    # SI matamos el backend, el desarrollador que corría start.local.py verá que su proceso muere.
    # ESTO ES DIFERENTE A DOCKER. En Docker reinicias el contenedor y sigue corriendo en background.
    # En local, si matas el proceso, matas la terminal del usuario.

    logger.warning("⚠️ En entorno LOCAL, 'reiniciar backend' detendrá el script start.local.py principal.")
    logger.warning("   Debes volver a ejecutar 'python start.local.py' manualmente.")

    # Opción alternativa: tocar un archivo que uvicorn esté observando (trigger reload)
    # Uvicorn observa todo el dir backend.
    trigger_file = PROJECT_ROOT / "backend" / "main.py"
    if trigger_file.exists():
        now = time.time()
        os.utime(trigger_file, (now, now))
        logger.info("✓ Se ha 'tocado' backend/main.py para forzar Hot Reload (si uvicorn está corriendo).")
    else:
        logger.info("No se encontró backend/main.py para forzar reload.")


def main():
    parser = argparse.ArgumentParser(description="Dev Pipeline (Homologado)")
    parser.add_argument("--hard", action="store_true", help="Reset total de DB")
    parser.add_argument("--soft", action="store_true", help="Smart migration")
    parser.add_argument("--front", action="store_true", help="Regenerar frontend")
    parser.add_argument("--back", action="store_true", help="Reiniciar/Reload Backend")
    parser.add_argument("--full", action="store_true", help="Full reset (Hard + Front)")

    args = parser.parse_args()

    # Cargar .env para saber puertos
    if (PROJECT_ROOT / ".env").exists():
        from dotenv import load_dotenv

        load_dotenv(PROJECT_ROOT / ".env")

    mode_selected = False

    if args.hard:
        rebuild_schema_hard()
        mode_selected = True

    if args.soft:
        sync_soft()
        mode_selected = True

    if args.back:
        restart_backend()
        mode_selected = True

    if args.front:
        regenerate_frontend()
        mode_selected = True

    if args.full:
        rebuild_schema_hard()
        regenerate_frontend()
        mode_selected = True

    if not mode_selected:
        # Default behavior: Soft sync
        sync_soft()


if __name__ == "__main__":
    main()
