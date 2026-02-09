#!/usr/bin/env python3
"""
Restart Script - ecommerce-playground
=====================================
Orquesta un reinicio limpio del ecosistema.
Detiene todos los servicios (backend/frontend) y los vuelve a iniciar.

Uso:
    python scripts/restart.py [--force]
"""

import argparse
import logging
import subprocess
import sys
import time
from pathlib import Path

# --- Configuración ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("Restart")

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
STOP_SCRIPT = PROJECT_ROOT / "stop.local.py"
START_SCRIPT = PROJECT_ROOT / "start.local.py"
PYTHON_EXE = sys.executable  # Usa el python del venv actual


def run_script(script_path: Path, args: list[str] | None = None, wait: bool = True):
    """Ejecuta un script auxiliar."""
    if args is None:
        args = []
    cmd = [PYTHON_EXE, str(script_path)] + args
    script_name = script_path.name

    logger.info(f"▶️  Ejecutando {script_name}...")
    try:
        # stop.local.py debe esperarse (wait=True) para asegurar liberación de puertos
        # start.local.py inicia demonios, pero el script principal se mantiene vivo un rato
        if wait:
            subprocess.run(cmd, check=True)
        else:
            # Para start, lanzamos y dejamos correr
            subprocess.Popen(cmd)

        logger.info(f"✅ {script_name} completado.")
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Error en {script_name}: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Error inesperado lanzando {script_name}: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Reiniciar ecosistema")
    parser.add_argument("--force", action="store_true", help="Forzar detención (kill)")
    args = parser.parse_args()

    print("\n==========================================")
    print(" 🔄 ECOMMERCE PLAYGROUND RESTART")
    print("==========================================\n")

    # 1. STOP
    stop_args = ["--force"] if args.force else []
    run_script(STOP_SCRIPT, args=stop_args, wait=True)

    # Pausa de seguridad para liberación de sockets
    logger.info("⏳ Esperando liberación de puertos (2s)...")
    time.sleep(2)

    # 2. START
    # Start script bloquea la terminal para mostrar logs, así que usamos wait=True
    # Si quisieramos modo "detach", start.local.py tendría que soportarlo o usar Popen aquí.
    # Dado que es un entorno dev, ver el start es útil.
    run_script(START_SCRIPT, wait=True)


if __name__ == "__main__":
    main()
