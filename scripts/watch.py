#!/usr/bin/env python3
"""
scripts/watch.py - Observador de Cambios en Tiempo Real
========================================================

Monitorea la carpeta `backend/` y ejecuta `scripts.regenerate`
automáticamente cuando se detectan cambios en el código.

Características:
- Debounce: Espera a que termines de escribir (y que Uvicorn reinicie)
- Filtros: Ignora archivos no relevantes (logs, pycache, git)
- Feedback visual: Muestra estado de regeneración en consola

Uso:
    python -m scripts.watch
"""

import sys
import time
import subprocess
import logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Configuración
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("Watcher")

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
BACKEND_DIR = PROJECT_ROOT / "backend"

# Tiempo de espera para agrupar cambios y permitir reinicio de backend (segundos)
DEBOUNCE_SECONDS = 3.0

class ChangeHandler(FileSystemEventHandler):
    def __init__(self):
        self.last_modified = 0
        self.timer_running = False
        self.changes_detected = False

    def on_any_event(self, event):
        if event.is_directory:
            return
        
        # Filtrar solo archivos relevantes
        filename = getattr(event, 'src_path', '')
        if not filename.endswith('.py'):
            return
        
        if '__pycache__' in filename or '.pytest_cache' in filename:
            return

        # Registrar cambio
        self.last_modified = time.time()
        if not self.changes_detected:
            self.changes_detected = True
            logger.info(f"📝 Cambio detectado en {Path(filename).name}...")

    def check_and_regenerate(self):
        """Verifica si ha pasado el tiempo de debounce y regenera."""
        if not self.changes_detected:
            return

        # Si ha pasado el tiempo de debounce
        if time.time() - self.last_modified > DEBOUNCE_SECONDS:
            self.changes_detected = False
            self.run_regenerate()

    def run_regenerate(self):
        logger.info("⏳ Detectando reinicio del backend...")
        
        # Ejecutar script de regeneración
        python = sys.executable
        cmd = [python, "-m", "scripts.regenerate", "--no-start"]
        
        try:
            logger.info("🔄 Regenerando tipos y cliente API...")
            result = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info("✅ Sincronización Backend -> Frontend completada")
            else:
                logger.error("❌ Error en regeneración:")
                # Mostrar solo las últimas líneas del error para no saturar
                print("\n".join(result.stdout.splitlines()[-5:]))
                print("\n".join(result.stderr.splitlines()[-5:]))
                
        except Exception as e:
            logger.error(f"❌ Fallo al ejecutar script: {e}")


def main():
    if not BACKEND_DIR.exists():
        logger.error(f"Directorio no encontrado: {BACKEND_DIR}")
        return 1

    event_handler = ChangeHandler()
    observer = Observer()
    observer.schedule(event_handler, str(BACKEND_DIR), recursive=True)
    
    observer.start()
    logger.info(f"👀 Observando cambios en {BACKEND_DIR}...")
    logger.info(f"⚡ Regeneración automática activa (debounce: {DEBOUNCE_SECONDS}s)")
    
    try:
        while True:
            time.sleep(1)
            event_handler.check_and_regenerate()
    except KeyboardInterrupt:
        observer.stop()
        logger.info("\n🛑 Watcher detenido")
    
    observer.join()
    return 0

if __name__ == "__main__":
    sys.exit(main())
