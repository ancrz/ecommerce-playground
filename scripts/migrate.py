#!/usr/bin/env python3
"""
scripts/migrate.py - Gestión de Migraciones de Base de Datos
=============================================================

Wrapper para Alembic con comandos simplificados.

Uso:
    python -m scripts.migrate             # Aplicar migraciones pendientes
    python -m scripts.migrate --generate  # Generar nueva migración
    python -m scripts.migrate --rollback  # Revertir última migración
    python -m scripts.migrate --status    # Ver estado de migraciones

Nota: Este proyecto usa SQLite con chunks separados, por lo que
Alembic puede no ser necesario para todas las tablas.
"""

import argparse
import logging
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# --- Configuración ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.resolve()


def load_env():
    """Carga variables de entorno desde .env."""
    env_file = PROJECT_ROOT / ".env"

    if not env_file.exists():
        return

    with open(env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key:
                    os.environ[key] = value


def get_python_executable() -> str:
    """Obtiene el ejecutable de Python del venv."""
    venv_path = PROJECT_ROOT / ".venv" / ("Scripts" if os.name == "nt" else "bin") / "python"
    if os.name == "nt":
        venv_path = venv_path.with_suffix(".exe")
    return str(venv_path) if venv_path.exists() else sys.executable


def run_alembic(*args) -> int:
    """Ejecuta un comando de Alembic."""
    python = get_python_executable()
    alembic_ini = PROJECT_ROOT / "alembic.ini"

    if not alembic_ini.exists():
        logger.error("❌ alembic.ini no encontrado")
        logger.error("   Este proyecto usa DatabaseManager con chunks SQLite")
        logger.error("   Las tablas se crean automáticamente en el startup")
        return 1

    cmd = [python, "-m", "alembic"] + list(args)
    logger.info(f"Ejecutando: {' '.join(cmd)}")

    result = subprocess.run(cmd, cwd=PROJECT_ROOT)
    return result.returncode


def cmd_upgrade() -> int:
    """Aplica todas las migraciones pendientes."""
    logger.info("📦 Aplicando migraciones pendientes...")
    return run_alembic("upgrade", "head")


def cmd_generate(message: str = None) -> int:
    """Genera una nueva migración con autogenerate."""
    if not message:
        message = f"auto_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    logger.info(f"📦 Generando migración: {message}")
    return run_alembic("revision", "--autogenerate", "-m", message)


def cmd_rollback() -> int:
    """Revierte la última migración."""
    logger.info("⚠️ Revirtiendo última migración...")
    return run_alembic("downgrade", "-1")


def cmd_status() -> int:
    """Muestra el estado de las migraciones."""
    logger.info("📋 Estado de migraciones:")
    return run_alembic("current")


def cmd_history() -> int:
    """Muestra el historial de migraciones."""
    logger.info("📋 Historial de migraciones:")
    return run_alembic("history", "--verbose")


def main():
    """Entry point principal."""
    parser = argparse.ArgumentParser(description="Gestión de migraciones de BD")
    parser.add_argument("--generate", "-g", action="store_true",
                       help="Generar nueva migración")
    parser.add_argument("--message", "-m", type=str,
                       help="Mensaje para la migración")
    parser.add_argument("--rollback", "-r", action="store_true",
                       help="Revertir última migración")
    parser.add_argument("--status", "-s", action="store_true",
                       help="Ver estado de migraciones")
    parser.add_argument("--history", action="store_true",
                       help="Ver historial de migraciones")
    args = parser.parse_args()

    print("\n>>> Gestión de Migraciones <<<\n")

    # Cargar configuración
    load_env()

    # Verificar si alembic está configurado
    alembic_ini = PROJECT_ROOT / "alembic.ini"

    if not alembic_ini.exists():
        logger.warning("=" * 60)
        logger.warning("ℹ️ Este proyecto NO usa Alembic para migraciones")
        logger.warning("")
        logger.warning("La base de datos utiliza DatabaseManager con SQLite por chunks.")
        logger.warning("Las tablas se crean automáticamente en el startup del backend.")
        logger.warning("")
        logger.warning("Para modificar el esquema:")
        logger.warning("1. Edita backend/database/manager.py (métodos _create_*_schema)")
        logger.warning("2. Elimina los archivos .db en data/database/")
        logger.warning("3. Reinicia el backend")
        logger.warning("=" * 60)
        return 0

    # Ejecutar comando
    if args.generate:
        return cmd_generate(args.message)
    elif args.rollback:
        return cmd_rollback()
    elif args.status:
        return cmd_status()
    elif args.history:
        return cmd_history()
    else:
        return cmd_upgrade()


if __name__ == "__main__":
    sys.exit(main())
