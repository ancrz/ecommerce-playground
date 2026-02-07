#!/usr/bin/env python3
"""
Deploy Stack Script - ecommerce-playground
========================================
Homologación de deploy-stack.sh a Python.
Funciona como el orquestador principal de inicio y configuración.

Responsabilidades:
1. Valida el entorno (Python, Node).
2. Inicializa dependencias (vía setup.py).
3. Gestiona variables de entorno.
4. Ejecuta migraciones de base de datos.
5. Genera clientes de API (Orval/Hooks).
6. Inicia el stack (vía start.local.py).

Uso:
    python deploy_stack.py [--reset] [--reset-app]
"""

import argparse
import logging
import os
import platform
import subprocess
import sys
from pathlib import Path

# --- Configuración ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("deploy_stack")

PROJECT_ROOT = Path(__file__).parent.resolve()
VENV_PATH = PROJECT_ROOT / ".venv"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
BACKEND_DIR = PROJECT_ROOT / "backend"

# Detectar OS para comandos
IS_WINDOWS = platform.system().lower() == "windows"
NPM_CMD = "npm.cmd" if IS_WINDOWS else "npm"
PYTHON_CMD = sys.executable


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
    except FileNotFoundError:
        logger.error(f"❌ Comando no encontrado: {cmd[0]}")
        sys.exit(1)


def get_venv_python():
    """Retorna el path al python del venv."""
    if IS_WINDOWS:
        return str(VENV_PATH / "Scripts" / "python.exe")
    return str(VENV_PATH / "bin" / "python")


def check_dependencies():
    """Verifica dependencias básicas."""
    logger.info("🔍 Verificando dependencias...")

    # Python version check is handled by setup.py
    pass

    # Check Node
    try:
        run_command(["node", "--version"], capture_output=True)
    except SystemExit:
        logger.error("❌ Node.js no encontrado.")
        sys.exit(1)

    logger.info("✓ Dependencias base OK.")


def run_setup(clean=False):
    """Ejecuta setup.py para garantizar dependencias."""
    logger.info("📦 Ejecutando Setup...")
    cmd = [PYTHON_CMD, str(PROJECT_ROOT / "setup.py")]
    if clean:
        cmd.append("--clean")

    run_command(cmd, cwd=PROJECT_ROOT)


def run_migrations():
    """Ejecuta migraciones de Alembic."""
    logger.info(">>> FASE 3: Migraciones")

    python_exe = get_venv_python()

    # Verificar si el venv existe (setup debería haberlo creado)
    if not os.path.exists(python_exe):
        logger.error(f"❌ No se encontró el entorno virtual en {python_exe}")
        sys.exit(1)

    logger.info("Aplicando migraciones (Alembic upgrade head)...")

    # Ejecutar alembic upgrade head
    # Nota: Usamos el python del venv para ejecutar el módulo alembic
    try:
        run_command([python_exe, "-m", "alembic", "upgrade", "head"], cwd=PROJECT_ROOT)
    except SystemExit:
        logger.warning("⚠️ Falló upgrade head. Intentando inicializar (revision --autogenerate)...")
        try:
            run_command(
                [python_exe, "-m", "alembic", "revision", "--autogenerate", "-m", "init_auto_deploy"], cwd=PROJECT_ROOT
            )
            run_command([python_exe, "-m", "alembic", "upgrade", "head"], cwd=PROJECT_ROOT)
        except SystemExit:
            logger.error("❌ Fallaron las migraciones. Revisa la configuración de BD.")
            sys.exit(1)

    logger.info("✓ Migraciones aplicadas.")


def generate_frontend_client():
    """Genera el cliente API (Orval)."""
    logger.info(">>> FASE 4: Cliente Frontend (Orval)")

    # Para ejecutar Orval necesitamos el backend corriendo para bajar el OpenAPI json...
    # O podemos usar el archivo openapi.json si está en disco.
    # El script original usa http://backend:8042/api/v1/openapi.json
    # Aquí, el backend NO está corriendo todavía.
    # ESTRATEGIA:
    # 1. Intentar generar usando un archivo local si existe (docs/openapi.json).
    # 2. Si no, advertir que se generará al iniciar el dev-pipeline.

    openapi_path = PROJECT_ROOT / "docs" / "openapi.json"

    if openapi_path.exists():
        logger.info(f"Usando esquema OpenAPI local: {openapi_path}")
        # Aquí tendríamos que configurar orval para leer de archivo, pero orval.config.js suele apuntar a URL.
        # Por simplicidad en este paso de 'deploy', omitiremos la generación SI requiere el servidor activo,
        # O iniciamos el servidor temporalmente.
        # PERO: dev-pipeline.sh espera a que el backend arranque.
        pass
    else:
        logger.warning(
            "⚠️ no se encontró docs/openapi.json. La generación del cliente frontend se hará en tiempo de ejecución o requiere backend activo."
        )

    # Instalamos deps del frontend por si acaso
    if (FRONTEND_DIR / "package.json").exists():
        logger.info("Verificando dependencias de frontend...")
        run_command([NPM_CMD, "install"], cwd=FRONTEND_DIR)

        # Intentamos generar si es posible (muchas veces orval está configurado para leer de url)
        # Si falla, no rompemos el deploy, solo avisamos.
        logger.info("Intentando generar cliente API...")
        try:
            run_command([NPM_CMD, "run", "generate:api"], cwd=FRONTEND_DIR, check=False)
        except Exception:
            logger.warning("⚠️ No se pudo generar el cliente API (probablemente el backend está apagado).")
            logger.warning("   Ejecuta 'python dev_pipeline.py --front' cuando el backend esté arriba.")


def main():
    parser = argparse.ArgumentParser(description="Deploy Stack (Homologado)")
    parser.add_argument("--reset", action="store_true", help="Factory Reset (limpia venv y DB)")
    parser.add_argument("--reset-app", action="store_true", help="Reset solo de la DB de aplicación")
    args = parser.parse_args()

    print("\n========================================")
    print(" EFIEMPRESA / ECOMMERCE PLAYGROUND - DEPLOY STACK")
    print("========================================\n")

    # 1. Check Dependencies
    check_dependencies()

    # 2. Setup (Reset logic handled inside run_setup via args or manual cleaning)
    if args.reset:
        logger.warning(">>> MODO FACTORY RESET <<<")
        # Setup clean maneja venv y db
        run_setup(clean=True)
    elif args.reset_app:
        logger.warning(">>> MODO RESET APP DB <<<")
        # Borrar DBs manualmente
        db_dir = PROJECT_ROOT / "data" / "database"
        if db_dir.exists():
            for f in db_dir.glob("*.db"):
                try:
                    f.unlink()
                    logger.info(f"Eliminado: {f.name}")
                except Exception as e:
                    logger.error(f"No se pudo eliminar {f.name}: {e}")
        run_setup(clean=False)
    else:
        run_setup(clean=False)

    # 3. Environment Headers
    # Asegurar .env (ya lo hace setup, pero re-verificamos)
    if not (PROJECT_ROOT / ".env").exists():
        logger.error("❌ Falta el archivo .env")
        sys.exit(1)

    # 4. Migrations
    run_migrations()

    # 5. Frontend Init
    generate_frontend_client()

    # 6. Start Stack
    logger.info(">>> FASE FINAL: Iniciando Stack")
    logger.info("Ejecutando start.local.py...")

    try:
        subprocess.run([PYTHON_CMD, str(PROJECT_ROOT / "start.local.py")])
    except KeyboardInterrupt:
        logger.info("\n🛑 Deploy detenido por el usuario.")


if __name__ == "__main__":
    main()
