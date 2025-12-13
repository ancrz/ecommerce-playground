"""
Scripts Runner Module
=====================
Este módulo proporciona entry points para los scripts del proyecto.
Se ejecutan via pyproject.toml [project.scripts]:
  - start: scripts.run:start
  - stop: scripts.run:stop  
  - setup: scripts.run:setup

También pueden ejecutarse directamente con Python:
  python -m scripts.run setup
  python -m scripts.run start
  python -m scripts.run stop
"""

import sys
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.resolve()


def setup():
    """Run the setup script to initialize the environment."""
    setup_script = PROJECT_ROOT / "setup.py"
    subprocess.run([sys.executable, str(setup_script)], cwd=PROJECT_ROOT)


def start():
    """Start the development servers."""
    start_script = PROJECT_ROOT / "start.local.py"
    subprocess.run([sys.executable, str(start_script)], cwd=PROJECT_ROOT)


def stop():
    """Stop all running development servers."""
    stop_script = PROJECT_ROOT / "stop.local.py"
    subprocess.run([sys.executable, str(stop_script)], cwd=PROJECT_ROOT)


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.run [setup|start|stop]")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    commands = {
        "setup": setup,
        "start": start,
        "stop": stop,
    }
    
    if command not in commands:
        print(f"Unknown command: {command}")
        print(f"Available commands: {', '.join(commands.keys())}")
        sys.exit(1)
    
    commands[command]()


if __name__ == "__main__":
    main()
