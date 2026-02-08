"""
Script de Restauración (Modo Local - SQLite)

Restaura un estado anterior desde un archivo .zip (creado por backup.local.py).
¡ADVERTENCIA! Esta es una operación destructiva. Eliminará la
carpeta './data' actual (DBs e imágenes) antes de restaurar.
"""

import logging
import shutil
import sys
import zipfile
from pathlib import Path

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuración de Rutas ---
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"

def restore_from_backup(backup_filepath: Path, force: bool = False):
    logger.info("--- Iniciando Proceso de Restauración (Modo Local/SQLite) ---")

    # 1. Validar que el archivo de backup exista
    if not backup_filepath.exists():
        logger.error(f"❌ Error fatal: El archivo de backup no existe en {backup_filepath}")
        return False

    logger.warning("¡ADVERTENCIA! Esta operación es DESTRUCTIVA.")
    logger.warning(f"Se eliminará por completo la carpeta: {DATA_DIR}")

    # 2. Confirmación (si no es forzado por automatización)
    if not force:
        confirm = input("¿Está seguro de que desea continuar? (Escriba 'si' para confirmar): ")
        if confirm.lower() != 'si':
            logger.info("Operación cancelada por el usuario.")
            return False

    # 3. Detener el servidor (Validación)
    pid_file = PROJECT_ROOT / "pids.json"
    mode_file = PROJECT_ROOT / "run.mode"
    if pid_file.exists() or mode_file.exists():
        logger.error("❌ Error fatal: El sistema parece estar en ejecución.")
        logger.error("   Por favor, ejecute 'python stop.local.py' ANTES de restaurar.")
        return False

    logger.info("Procediendo con la restauración...")

    try:
        # 4. Eliminar la carpeta 'data' actual
        if DATA_DIR.exists():
            logger.info(f"Eliminando directorio de datos actual: {DATA_DIR}")
            shutil.rmtree(DATA_DIR)
            logger.info("Directorio 'data' eliminado.")
        else:
            logger.info("No existe un directorio 'data' actual. Se creará uno nuevo.")

        # 5. Extraer el backup
        logger.info(f"Restaurando desde {backup_filepath}...")
        with zipfile.ZipFile(backup_filepath, 'r') as zipf:
            # Extraer todo en la raíz del proyecto
            zipf.extractall(path=PROJECT_ROOT)

        logger.info("✅ Restauración (SQLite) completada exitosamente.")
        logger.info("Ahora puede iniciar el servidor con 'python start.local.py'.")
        logger.info("--- Proceso de Restauración Finalizado ---")
        return True

    except zipfile.BadZipFile:
        logger.error(f"❌ Error fatal: El archivo '{backup_filepath.name}' no es un .zip válido o está corrupto.")
        return False
    except Exception as e:
        logger.error(f"❌ Error fatal durante la restauración: {e}", exc_info=True)
        return False

if __name__ == "__main__":
    # --- Lógica de Argumentos (Compatible con automatización) ---

    force_mode = False
    backup_file_arg = None

    # python scripts/restore.local.py _backups/file.zip
    if len(sys.argv) == 2:
        backup_file_arg = sys.argv[1]

    # python scripts/restore.local.py _backups/file.zip --force
    if len(sys.argv) == 3 and sys.argv[2] == '--force':
        backup_file_arg = sys.argv[1]
        force_mode = True
        logger.info("Modo --force detectado. Se omitirá la confirmación.")

    if not backup_file_arg:
        print("Error: Debe proporcionar la ruta al archivo .zip del backup.")
        print("Uso:   python scripts/restore.local.py <ruta_al_backup.zip> [--force]")
        sys.exit(1)

    if not restore_from_backup(Path(backup_file_arg), force=force_mode):
        sys.exit(1) # Terminar con código de error si la restauración falló
