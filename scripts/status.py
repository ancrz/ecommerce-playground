#!/usr/bin/env python3
"""
scripts/status.py - Estado del Ecosistema
==========================================

Muestra el estado actual de todos los servicios y componentes.

Uso:
    python -m scripts.status
"""

import logging
import os
import socket
import sys
from datetime import datetime
from pathlib import Path

# --- Configuración ---
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.resolve()


def load_env():
    """Carga variables de entorno desde .env."""
    env_file = PROJECT_ROOT / ".env"

    if not env_file.exists():
        return

    with open(env_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key:
                    os.environ[key] = value


def is_port_in_use(port: int) -> bool:
    """Verifica si un puerto está en uso."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", port))
            return False
        except OSError:
            return True


def check_health(port: int, path: str = "/") -> bool:
    """Verifica si un servicio responde."""
    import urllib.request

    try:
        with urllib.request.urlopen(f"http://localhost:{port}{path}", timeout=5) as response:
            return response.status == 200
    except Exception:
        return False


def check_file_exists(path: Path) -> str:
    """Verifica si un archivo existe y retorna string de estado."""
    if path.exists():
        size = path.stat().st_size
        mtime = datetime.fromtimestamp(path.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
        return f"✓ {size:,} bytes ({mtime})"
    return "✗ No existe"


def check_dir_exists(path: Path) -> str:
    """Verifica si un directorio existe."""
    if path.exists() and path.is_dir():
        count = len(list(path.iterdir()))
        return f"✓ {count} items"
    return "✗ No existe"


def main():
    """Entry point principal."""
    load_env()

    backend_port = int(os.getenv("BACKEND_PORT", "8042"))
    frontend_port = int(os.getenv("FRONTEND_PORT", "5173"))

    print()
    print("╔════════════════════════════════════════════════════════════════╗")
    print("║          ecommerce-playground - Estado del Sistema               ║")
    print("╠════════════════════════════════════════════════════════════════╣")
    print("║                                                                ║")

    # Servicios
    backend_running = is_port_in_use(backend_port)
    backend_healthy = check_health(backend_port, "/api/products") if backend_running else False
    frontend_running = is_port_in_use(frontend_port)

    backend_status = "🟢 CORRIENDO" if backend_running else "🔴 DETENIDO"
    backend_health = "(healthy)" if backend_healthy else "(sin respuesta)" if backend_running else ""
    frontend_status = "🟢 CORRIENDO" if frontend_running else "🔴 DETENIDO"

    print("║  SERVICIOS                                                     ║")
    print(f"║    Backend  (:{backend_port})  {backend_status:20} {backend_health:15}║")
    print(f"║    Frontend (:{frontend_port})  {frontend_status:20}                ║")
    print("║                                                                ║")

    # Archivos de configuración
    env_status = "✓" if (PROJECT_ROOT / ".env").exists() else "✗"
    frontend_env_status = "✓" if (PROJECT_ROOT / "frontend" / ".env").exists() else "✗"
    venv_status = "✓" if (PROJECT_ROOT / ".venv").exists() else "✗"
    node_modules = "✓" if (PROJECT_ROOT / "frontend" / "node_modules").exists() else "✗"

    print("║  CONFIGURACIÓN                                                 ║")
    print(f"║    .env (backend)         {env_status}                                    ║")
    print(f"║    frontend/.env          {frontend_env_status}                                    ║")
    print(f"║    .venv (Python)         {venv_status}                                    ║")
    print(f"║    node_modules           {node_modules}                                    ║")
    print("║                                                                ║")

    # Base de datos
    db_path = PROJECT_ROOT / "data" / "database"
    db_files = list(db_path.glob("*.db")) if db_path.exists() else []

    print("║  BASE DE DATOS                                                 ║")
    print(f"║    Directorio: {check_dir_exists(db_path):47}║")
    print(f"║    Archivos DB: {len(db_files):46}║")
    print("║                                                                ║")

    # Uploads
    uploads_path = PROJECT_ROOT / "data" / "uploads"

    print("║  UPLOADS                                                       ║")
    print(f"║    Directorio: {check_dir_exists(uploads_path):47}║")
    print("║                                                                ║")

    # URLs
    print("║  URLs                                                          ║")
    if backend_running:
        print(f"║    API:      http://localhost:{backend_port}/api                      ║")
        print(f"║    Docs:     http://localhost:{backend_port}/docs                     ║")
    if frontend_running:
        print(f"║    App:      http://localhost:{frontend_port}                          ║")
    if not backend_running and not frontend_running:
        print("║    (No hay servicios corriendo)                                ║")
    print("║                                                                ║")

    print("╚════════════════════════════════════════════════════════════════╝")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
