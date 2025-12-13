#!/usr/bin/env python3
"""
Stop Development Servers - farmalux-ecommerce
==============================================
Detiene todos los procesos del servidor de desarrollo.

Uso:
    python stop.local.py

El script busca y termina:
1. Procesos de Uvicorn (backend)
2. Procesos de npm/node (frontend)
3. Cualquier proceso Python relacionado
"""

import sys
import os
import subprocess
import logging
from pathlib import Path

# Try to import psutil, but have fallback
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

# --- Configuración ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.resolve()


def load_env():
    """Load environment variables from .env file."""
    env_file = PROJECT_ROOT / ".env"
    
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, value = line.partition('=')
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key and key not in os.environ:
                        os.environ[key] = value


def stop_with_psutil():
    """Stop processes using psutil (recommended)."""
    backend_port = int(os.getenv("BACKEND_PORT", "8000"))
    frontend_port = int(os.getenv("FRONTEND_PORT", "5173"))
    
    killed = 0
    
    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'connections']):
        try:
            proc_info = proc.info
            cmdline = ' '.join(proc_info.get('cmdline') or [])
            name = proc_info.get('name', '').lower()
            
            # Check if it's a uvicorn process for our backend
            if 'uvicorn' in cmdline and 'backend.main:app' in cmdline:
                logger.info(f"🛑 Deteniendo Backend (PID: {proc.pid})")
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except psutil.TimeoutExpired:
                    proc.kill()
                killed += 1
                continue
            
            # Check if it's a node/npm process for our frontend
            if 'node' in name or 'npm' in name:
                # Check if it's listening on our frontend port
                try:
                    connections = proc.connections()
                    for conn in connections:
                        if conn.laddr.port == frontend_port:
                            logger.info(f"🛑 Deteniendo Frontend (PID: {proc.pid})")
                            proc.terminate()
                            try:
                                proc.wait(timeout=5)
                            except psutil.TimeoutExpired:
                                proc.kill()
                            killed += 1
                            break
                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    pass
            
            # Check by port - processes listening on our ports
            try:
                connections = proc.connections()
                for conn in connections:
                    if conn.laddr.port in (backend_port, frontend_port):
                        port_type = "Backend" if conn.laddr.port == backend_port else "Frontend"
                        logger.info(f"🛑 Deteniendo {port_type} en puerto {conn.laddr.port} (PID: {proc.pid})")
                        proc.terminate()
                        try:
                            proc.wait(timeout=5)
                        except psutil.TimeoutExpired:
                            proc.kill()
                        killed += 1
                        break
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                pass
                
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    
    return killed


def stop_with_netstat():
    """Stop processes using netstat/taskkill (Windows fallback)."""
    backend_port = os.getenv("BACKEND_PORT", "8000")
    frontend_port = os.getenv("FRONTEND_PORT", "5173")
    
    killed = 0
    
    for port, name in [(backend_port, "Backend"), (frontend_port, "Frontend")]:
        try:
            # Find PID using netstat
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True,
                text=True,
                check=True
            )
            
            for line in result.stdout.splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        try:
                            pid_int = int(pid)
                            logger.info(f"🛑 Deteniendo {name} en puerto {port} (PID: {pid})")
                            subprocess.run(
                                ["taskkill", "/F", "/PID", pid],
                                capture_output=True,
                                check=True
                            )
                            killed += 1
                        except (ValueError, subprocess.CalledProcessError):
                            pass
        except subprocess.CalledProcessError:
            pass
    
    return killed


def stop_with_lsof():
    """Stop processes using lsof/kill (Unix fallback)."""
    backend_port = os.getenv("BACKEND_PORT", "8000")
    frontend_port = os.getenv("FRONTEND_PORT", "5173")
    
    killed = 0
    
    for port, name in [(backend_port, "Backend"), (frontend_port, "Frontend")]:
        try:
            # Find PID using lsof
            result = subprocess.run(
                ["lsof", "-i", f":{port}", "-t"],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.stdout.strip():
                for pid in result.stdout.strip().splitlines():
                    try:
                        pid_int = int(pid.strip())
                        logger.info(f"🛑 Deteniendo {name} en puerto {port} (PID: {pid})")
                        os.kill(pid_int, 15)  # SIGTERM
                        killed += 1
                    except (ValueError, OSError):
                        pass
        except FileNotFoundError:
            pass
    
    return killed


def main():
    """Main entry point."""
    print(">>> Deteniendo farmalux-ecommerce <<<")
    print("")
    
    # Load environment to get port numbers
    load_env()
    
    killed = 0
    
    if HAS_PSUTIL:
        logger.info("Usando psutil para detectar procesos...")
        killed = stop_with_psutil()
    elif sys.platform == "win32":
        logger.info("Usando netstat/taskkill (psutil no disponible)...")
        killed = stop_with_netstat()
    else:
        logger.info("Usando lsof/kill (psutil no disponible)...")
        killed = stop_with_lsof()
    
    print("")
    if killed > 0:
        logger.info(f"✓ {killed} proceso(s) detenido(s)")
    else:
        logger.info("No se encontraron procesos en ejecución")
    
    print("")


if __name__ == "__main__":
    main()
