#!/usr/bin/env python3
"""
Setup Script - farmalux-ecommerce (v4.1)
=========================================
Inicializa el entorno de desarrollo completo.

Responsabilidades:
1. Verifica que Python >= 3.11 esté instalado
2. Crea el entorno virtual (.venv)
3. Instala dependencias desde pyproject.toml
4. Instala dependencias del frontend (npm)
5. Copia .env.example a .env si no existe
6. Inicializa la base de datos con datos semilla

Uso:
    python setup.py [--clean]

    --clean: Elimina .venv y data/database antes de recrear
"""

import argparse
import logging
import shutil
import subprocess
import sys
from pathlib import Path

# --- Configuración ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.resolve()
VENV_PATH = PROJECT_ROOT / ".venv"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
DATA_DIR = PROJECT_ROOT / "data"
DATABASE_DIR = DATA_DIR / "database"

MIN_PYTHON_VERSION = (3, 11)


def print_header(text: str) -> None:
    """Print a formatted header."""
    logger.info("=" * 70)
    logger.info(f"  {text}")
    logger.info("=" * 70)


def check_python_version() -> bool:
    """Verify Python version meets requirements."""
    current = sys.version_info[:2]
    if current < MIN_PYTHON_VERSION:
        logger.error(
            f"❌ Python {MIN_PYTHON_VERSION[0]}.{MIN_PYTHON_VERSION[1]}+ requerido. Actual: {current[0]}.{current[1]}"
        )
        return False
    logger.info(f"✓ Python {current[0]}.{current[1]} detectado")
    return True


def run_command(command: list, cwd: Path | None = None, shell: bool = False) -> bool:
    """Execute a command and return success status."""
    cmd_str = " ".join(str(c) for c in command)
    logger.info(f"Ejecutando: {cmd_str}")

    try:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="ignore",
            shell=shell,
        )

        if process.stdout:
            for line in iter(process.stdout.readline, ""):
                if line.strip():
                    sys.stdout.write(f"  > {line}")

        process.wait()

        if process.returncode != 0:
            logger.error(f"❌ Comando falló con código {process.returncode}")
            return False
        return True

    except FileNotFoundError:
        logger.error(f"❌ Comando no encontrado: {command[0]}")
        return False
    except Exception as e:
        logger.error(f"❌ Error ejecutando comando: {e}")
        return False


def create_venv() -> tuple[str, str]:
    """Create virtual environment and return paths to python and pip."""
    print_header("Paso 1: Creando Entorno Virtual")

    if VENV_PATH.exists():
        logger.warning("Directorio .venv existente encontrado. Eliminándolo...")
        shutil.rmtree(VENV_PATH, ignore_errors=True)

    if not run_command([sys.executable, "-m", "venv", str(VENV_PATH)]):
        logger.error("❌ No se pudo crear el entorno virtual")
        sys.exit(1)

    logger.info("✓ Entorno virtual .venv creado")

    # Determine executable paths based on OS
    if sys.platform == "win32":
        python_exe = str(VENV_PATH / "Scripts" / "python.exe")
        pip_exe = str(VENV_PATH / "Scripts" / "pip.exe")
    else:
        python_exe = str(VENV_PATH / "bin" / "python")
        pip_exe = str(VENV_PATH / "bin" / "pip")

    return python_exe, pip_exe


def install_python_deps(pip_exe: str) -> None:
    """Install Python dependencies from pyproject.toml."""
    print_header("Paso 2: Instalando Dependencias de Python")

    # Upgrade pip first
    run_command([pip_exe, "install", "--upgrade", "pip"])

    # Install project in editable mode with dev dependencies
    if not run_command([pip_exe, "install", "-e", ".[dev]"]):
        logger.error("❌ Falló la instalación de dependencias Python")
        logger.error("Si el error es de Pillow, asegúrate de tener Visual Studio C++ Build Tools")
        sys.exit(1)

    logger.info("✓ Dependencias de Python instaladas")


def install_frontend_deps() -> None:
    """Install Node.js dependencies."""
    print_header("Paso 3: Instalando Dependencias del Frontend")

    if not FRONTEND_DIR.exists():
        logger.warning("Carpeta frontend/ no encontrada. Omitiendo...")
        return

    # Check if npm is available
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"

    if not run_command([npm_cmd, "install"], cwd=FRONTEND_DIR, shell=True):
        logger.error("❌ Falló la instalación de dependencias Node.js")
        logger.error("Asegúrate de tener Node.js instalado: https://nodejs.org/")
        sys.exit(1)

    logger.info("✓ Dependencias del frontend instaladas")


def setup_env_file() -> None:
    """Copy .env.example to .env if needed."""
    print_header("Paso 4: Configurando Variables de Entorno")

    env_file = PROJECT_ROOT / ".env"
    env_example = PROJECT_ROOT / ".env.example"

    if not env_example.exists():
        logger.error("❌ No se encontró .env.example")
        sys.exit(1)

    if env_file.exists():
        logger.info("Archivo .env existente encontrado. Manteniendo...")
    else:
        shutil.copy(env_example, env_file)
        logger.info("✓ Archivo .env creado desde .env.example")


def run_migrations(python_exe: str) -> None:
    """Run Alembic migrations."""
    logger.info("  > Ejecutando migraciones (Alembic)...")

    # Init if needed (only if no versions exist, but upgrade head handles empty DBs usually if revision exists)
    # We try upgrade head directly.
    cmd = [python_exe, "-m", "alembic", "upgrade", "head"]

    if not run_command(cmd, cwd=PROJECT_ROOT):
        logger.warning("  ⚠️ 'alembic upgrade head' falló. Intentando inicializar...")
        # Try to creat initial revision if it fails (first run)
        cmd_init = [python_exe, "-m", "alembic", "revision", "--autogenerate", "-m", "initial_setup"]
        run_command(cmd_init, cwd=PROJECT_ROOT)
        run_command(cmd, cwd=PROJECT_ROOT)


def init_database(python_exe: str) -> None:
    """Initialize database schema."""
    print_header("Paso 5: Inicializando Base de Datos")

    # Ensure database directory exists
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Run Migrations first
    run_migrations(python_exe)

    # 2. Create seed script that initializes the database
    seed_script = PROJECT_ROOT / "scripts" / "seed_data.py"

    if seed_script.exists():
        logger.info("  > Sembrando datos iniciales...")
        if not run_command([python_exe, str(seed_script)]):
            logger.warning("⚠️ El script de seed tuvo errores, pero continuamos...")
    else:
        logger.info("No se encontró scripts/seed_data.py - la DB se inicializará al primer arranque")

    logger.info("✓ Base de datos preparada")


def main():
    """Main setup function."""
    parser = argparse.ArgumentParser(description="Setup farmalux-ecommerce")
    parser.add_argument("--clean", action="store_true", help="Clean install (remove existing venv and db)")
    args = parser.parse_args()

    print_header("Setup de farmalux-ecommerce (v4.1)")

    # Check Python version
    if not check_python_version():
        sys.exit(1)

    # Clean mode
    if args.clean:
        logger.warning("Modo --clean: Eliminando datos existentes...")
        if VENV_PATH.exists():
            shutil.rmtree(VENV_PATH, ignore_errors=True)
        if DATABASE_DIR.exists():
            for db_file in DATABASE_DIR.glob("*.db"):
                db_file.unlink()

    # Run setup steps
    python_exe, pip_exe = create_venv()
    install_python_deps(pip_exe)
    install_frontend_deps()
    setup_env_file()
    init_database(python_exe)

    # Final message
    print_header("✅ ¡Setup Completado!")
    logger.info("")
    logger.info("Para empezar a trabajar:")
    logger.info("")
    if sys.platform == "win32":
        logger.info("  1. Activa el entorno: .\\.venv\\Scripts\\Activate.ps1")
    else:
        logger.info("  1. Activa el entorno: source .venv/bin/activate")
    logger.info("  2. Inicia los servidores: python start.local.py")
    logger.info("")
    logger.info("O usa los scripts directamente:")
    logger.info("  python -m scripts.run start")
    logger.info("")


if __name__ == "__main__":
    main()
