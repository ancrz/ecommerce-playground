"""
Script de Backup (Modo Local - SQLite)

Crea un archivo .zip de toda la carpeta './data' (bases de datos SQLite y archivos subidos).
Diseñado para ser llamado desde automatización (ej. Tareas Programadas).
"""

import os
import zipfile
from pathlib import Path
from datetime import datetime
import logging
import sys

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuración de Rutas ---
PROJECT_ROOT = Path(__file__).parent.parent
SOURCE_DIR = PROJECT_ROOT / "data"
BACKUP_DIR = PROJECT_ROOT / "_backups"
# --- Fin Configuración ---

def zip_directory(path: Path, zip_handle: zipfile.ZipFile, root_dir: Path):
    """Añade recursivamente un directorio a un archivo zip."""
    for root, dirs, files in os.walk(path):
        for file in files:
            file_path = Path(root) / file
            # Ruta relativa dentro del zip (ej: 'data/database/products.db')
            archive_path = file_path.relative_to(root_dir)
            logger.info(f"  + Comprimiendo {archive_path}")
            zip_handle.write(file_path, archive_path)

def create_backup():
    logger.info("--- Iniciando Proceso de Backup (Modo Local/SQLite) ---")
    
    # 1. Asegurarse de que el directorio de backups exista
    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.error(f"❌ Error fatal: No se pudo crear el directorio de backup en {BACKUP_DIR}: {e}")
        return False

    # 2. Definir nombre del archivo (sin marca)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_filename = f"backup-sqlite-{timestamp}.zip"
    backup_filepath = BACKUP_DIR / backup_filename
    
    logger.info(f"Creando backup en: {backup_filepath}")

    # 3. Validar que la carpeta 'data' exista
    if not SOURCE_DIR.exists() or not SOURCE_DIR.is_dir():
        logger.error(f"❌ Error fatal: El directorio de datos '{SOURCE_DIR}' no existe.")
        return False

    # 4. Crear el archivo .zip
    try:
        # Importante: root_dir es SOURCE_DIR.parent (la raíz del proyecto)
        # para que el zip contenga la carpeta 'data/'
        with zipfile.ZipFile(backup_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zip_directory(SOURCE_DIR, zipf, SOURCE_DIR.parent)
            
        logger.info(f"✅ Backup (SQLite) completado exitosamente.")
        logger.info(f"Archivo: {backup_filepath}")
        logger.info("--- Proceso de Backup Finalizado ---")
        return True

    except Exception as e:
        logger.error(f"❌ Error fatal durante la compresión: {e}", exc_info=True)
        try:
            os.remove(backup_filepath) # Eliminar archivo corrupto si falló
        except OSError:
            pass
        return False

if __name__ == "__main__":
    if not create_backup():
        sys.exit(1) # Terminar con código de error si el backup falló