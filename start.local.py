#!/usr/bin/env python3
"""
Start Development Servers - farmalux-ecommerce
===============================================
Inicia el backend (FastAPI/Uvicorn) y frontend (Vite) en modo desarrollo.

Uso:
    python start.local.py [--backend-only] [--frontend-only]

El script:
1. Verifica que el entorno virtual exista
2. Carga las variables de entorno desde .env
3. Inicia el backend en el puerto BACKEND_PORT
4. Inicia el frontend en el puerto FRONTEND_PORT
5. Espera señales de interrupción para terminar gracefully
"""

import sys
import os
import subprocess
import signal
import time
import logging
from pathlib import Path
from typing import Optional
import argparse

# --- Configuración ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.resolve()
VENV_PATH = PROJECT_ROOT / ".venv"
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"


def load_env():
    """Load environment variables from .env file."""
    env_file = PROJECT_ROOT / ".env"
    
    if not env_file.exists():
        env_example = PROJECT_ROOT / ".env.example"
        if env_example.exists():
            import shutil
            shutil.copy(env_example, env_file)
            logger.info("✓ Archivo .env creado desde .env.example")
        else:
            logger.warning("⚠️ No se encontró .env ni .env.example")
            return
    
    # Parse .env file manually (no external dependencies)
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value


def get_venv_python() -> str:
    """Get path to Python executable in virtual environment."""
    if sys.platform == "win32":
        return str(VENV_PATH / "Scripts" / "python.exe")
    return str(VENV_PATH / "bin" / "python")


def check_venv() -> bool:
    """Verify virtual environment exists."""
    python_exe = get_venv_python()
    if not Path(python_exe).exists():
        logger.error(f"❌ Entorno virtual no encontrado: {python_exe}")
        logger.error("   Ejecuta 'python setup.py' primero")
        return False
    return True


class ServerManager:
    """Manages backend and frontend server processes."""
    
    def __init__(self):
        self.processes: dict[str, subprocess.Popen] = {}
        self._setup_signal_handlers()
    
    def _setup_signal_handlers(self):
        """Setup handlers for graceful shutdown."""
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        if sys.platform != "win32":
            signal.signal(signal.SIGHUP, self._handle_shutdown)
    
    def _handle_shutdown(self, signum, frame):
        """Handle shutdown signals."""
        logger.info("\n🛑 Señal de detención recibida...")
        self.stop_all()
        sys.exit(0)
    
    def start_backend(self) -> bool:
        """Start FastAPI/Uvicorn backend server."""
        python_exe = get_venv_python()
        host = os.getenv("BACKEND_HOST", "localhost")
        port = os.getenv("BACKEND_PORT", "8000")
        
        logger.info(f"🚀 Iniciando Backend en http://{host}:{port}")
        
        cmd = [
            python_exe, "-m", "uvicorn",
            "backend.main:app",
            "--host", host,
            "--port", port,
            "--reload",
            "--log-level", "info"
        ]
        
        try:
            process = subprocess.Popen(
                cmd,
                cwd=PROJECT_ROOT,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                encoding='utf-8',
                errors='replace'
            )
            self.processes["backend"] = process
            logger.info(f"✓ Backend iniciado (PID: {process.pid})")
            return True
        except Exception as e:
            logger.error(f"❌ Error iniciando backend: {e}")
            return False
    
    def start_frontend(self) -> bool:
        """Start Vite frontend dev server."""
        if not FRONTEND_DIR.exists():
            logger.warning("⚠️ Carpeta frontend/ no encontrada")
            return False
        
        host = os.getenv("FRONTEND_HOST", "localhost")
        port = os.getenv("FRONTEND_PORT", "5173")
        
        logger.info(f"🚀 Iniciando Frontend en http://{host}:{port}")
        
        # Determine npm command based on OS
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        
        cmd = [npm_cmd, "run", "dev", "--", "--host", host, "--port", port]
        
        try:
            process = subprocess.Popen(
                cmd,
                cwd=FRONTEND_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                shell=True if sys.platform == "win32" else False,
                encoding='utf-8',
                errors='replace'
            )
            self.processes["frontend"] = process
            logger.info(f"✓ Frontend iniciado (PID: {process.pid})")
            return True
        except Exception as e:
            logger.error(f"❌ Error iniciando frontend: {e}")
            return False
    
    def monitor(self):
        """Monitor running processes and print their output."""
        import select
        
        logger.info("")
        logger.info("=" * 60)
        logger.info("  Servidores en ejecución - Presiona Ctrl+C para detener")
        logger.info("=" * 60)
        logger.info("")
        
        while self.processes:
            for name, proc in list(self.processes.items()):
                if proc.poll() is not None:
                    # Process has terminated
                    logger.warning(f"⚠️ {name} terminó inesperadamente (código: {proc.returncode})")
                    del self.processes[name]
                elif proc.stdout:
                    # Read output if available (non-blocking on Unix)
                    try:
                        line = proc.stdout.readline()
                        if line:
                            print(f"[{name.upper()}] {line.rstrip()}")
                    except Exception:
                        pass
            
            time.sleep(0.1)
    
    def stop_all(self):
        """Stop all running processes."""
        logger.info("Deteniendo servidores...")
        
        for name, proc in self.processes.items():
            if proc.poll() is None:
                logger.info(f"  Terminando {name} (PID: {proc.pid})...")
                try:
                    proc.terminate()
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    logger.warning(f"  Forzando terminación de {name}...")
                    proc.kill()
                except Exception as e:
                    logger.error(f"  Error deteniendo {name}: {e}")
        
        self.processes.clear()
        logger.info("✓ Todos los servidores detenidos")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Start development servers")
    parser.add_argument("--backend-only", action="store_true", help="Start only backend")
    parser.add_argument("--frontend-only", action="store_true", help="Start only frontend")
    args = parser.parse_args()
    
    print(">>> Iniciando farmalux-ecommerce <<<")
    print("")
    
    # Load environment
    load_env()
    
    # Check virtual environment
    if not args.frontend_only and not check_venv():
        sys.exit(1)
    
    # Start servers
    manager = ServerManager()
    
    try:
        if not args.frontend_only:
            if not manager.start_backend():
                logger.error("No se pudo iniciar el backend")
                sys.exit(1)
            time.sleep(2)  # Wait for backend to initialize
        
        if not args.backend_only:
            if not manager.start_frontend():
                logger.warning("Frontend no iniciado (puede no ser crítico)")
        
        # Monitor processes
        manager.monitor()
        
    except KeyboardInterrupt:
        pass
    finally:
        manager.stop_all()


if __name__ == "__main__":
    main()
