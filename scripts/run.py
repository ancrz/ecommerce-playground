#!/usr/bin/env python3
"""
scripts/run.py - Entry Point Unificado para el Ecosistema
==========================================================

Uso:
    python -m scripts.run setup     # Configurar ambiente desde cero
    python -m scripts.run start     # Iniciar servidores (backend + frontend)
    python -m scripts.run stop      # Detener todos los servidores
    python -m scripts.run restart   # Detener e iniciar
    python -m scripts.run status    # Ver estado del sistema
    python -m scripts.run regen     # Regenerar cliente API (OpenAPI → Zod)
    python -m scripts.run migrate   # Ejecutar migraciones de BD
    python -m scripts.run seed      # Poblar BD con datos de prueba

Este script orquesta todos los demás y maneja los casos de uso comunes.
"""

import sys
import os
import subprocess
import logging
from pathlib import Path

# Configuración
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.resolve()


def get_python_executable():
    """Obtiene el ejecutable de Python del venv."""
    venv_python = PROJECT_ROOT / ".venv" / ("Scripts" if os.name == "nt" else "bin") / "python"
    if os.name == "nt":
        venv_python = venv_python.with_suffix(".exe")
    
    if venv_python.exists():
        return str(venv_python)
    return sys.executable


def run_script(script_name: str, *args) -> int:
    """Ejecuta un script del proyecto."""
    python = get_python_executable()
    script_path = PROJECT_ROOT / script_name
    
    if not script_path.exists():
        logger.error(f"❌ Script no encontrado: {script_path}")
        return 1
    
    cmd = [python, str(script_path)] + list(args)
    logger.info(f"Ejecutando: {' '.join(cmd)}")
    
    result = subprocess.run(cmd, cwd=PROJECT_ROOT)
    return result.returncode


def cmd_setup():
    """Configurar ambiente desde cero."""
    return run_script("setup.py")


def cmd_start():
    """Iniciar servidores."""
    return run_script("start.local.py")


def cmd_stop():
    """Detener servidores."""
    return run_script("stop.local.py")


def cmd_restart():
    """Detener e iniciar."""
    cmd_stop()
    return cmd_start()


def cmd_status():
    """Ver estado del sistema."""
    return run_script("scripts/status.py")


def cmd_regen():
    """Regenerar cliente API."""
    return run_script("scripts/regenerate.py")


def cmd_migrate():
    """Ejecutar migraciones."""
    return run_script("scripts/migrate.py")


def cmd_seed():
    """Poblar BD con datos de prueba."""
    return run_script("scripts/seed_data.py")


def print_help():
    """Imprime ayuda de uso."""
    help_text = """
╔════════════════════════════════════════════════════════════════╗
║          ecommerce-playground - Sistema de Gestión             ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Comandos disponibles:                                         ║
║                                                                ║
║    setup     Configurar ambiente desde cero                    ║
║    start     Iniciar servidores (backend + frontend)           ║
║    stop      Detener todos los servidores                      ║
║    restart   Detener e iniciar                                 ║
║    status    Ver estado del sistema                            ║
║    regen     Regenerar cliente API (OpenAPI → Zod)             ║
║    migrate   Ejecutar migraciones de BD                        ║
║    seed      Poblar BD con datos de prueba                     ║
║                                                                ║
║  Uso:                                                          ║
║    python -m scripts.run <comando>                             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"""
    print(help_text)


def main():
    """Entry point principal."""
    if len(sys.argv) < 2:
        print_help()
        return 1
    
    command = sys.argv[1].lower()
    
    commands = {
        'setup': cmd_setup,
        'start': cmd_start,
        'stop': cmd_stop,
        'restart': cmd_restart,
        'status': cmd_status,
        'regen': cmd_regen,
        'regenerate': cmd_regen,
        'migrate': cmd_migrate,
        'seed': cmd_seed,
        'help': lambda: (print_help(), 0)[1],
        '--help': lambda: (print_help(), 0)[1],
        '-h': lambda: (print_help(), 0)[1],
    }
    
    if command not in commands:
        logger.error(f"❌ Comando desconocido: {command}")
        print_help()
        return 1
    
    return commands[command]()


if __name__ == "__main__":
    sys.exit(main())
