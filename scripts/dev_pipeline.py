import argparse
import json
import logging
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

# --- Configuración ---
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
import os
BACKEND_PORT = os.getenv("BACKEND_PORT", "8042")
BACKEND_LOG_URL = f"http://127.0.0.1:{BACKEND_PORT}/api/health"
OPENAPI_LOCAL_PATH = PROJECT_ROOT / "docs" / "openapi.json"
FRONTEND_DIR = PROJECT_ROOT / "frontend"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("DevPipeline")


def generate_static_schema():
    """
    Genera el archivo openapi.json IMPORTANDO la app, sin levantar el servidor.
    Esto permite regenerar el frontend incluso si el backend no inicia por errores de puerto.
    """
    logger.info("📄 Generando esquema OpenAPI estáticamente...")
    sys.path.insert(0, str(PROJECT_ROOT))  # Asegurar que backend sea importable

    try:
        from backend.main import app
        
        openapi_content = app.openapi()
        
        # Asegurar directorio
        OPENAPI_LOCAL_PATH.parent.mkdir(exist_ok=True)
        
        with open(OPENAPI_LOCAL_PATH, "w", encoding="utf-8") as f:
            json.dump(openapi_content, f, indent=2)
            
        logger.info(f"✅ Esquema guardado en: {OPENAPI_LOCAL_PATH}")
        return True
    except ImportError as e:
        logger.error(f"❌ Error importando backend: {e}")
        logger.error("   Asegúrate de que estás corriendo esto desde el venv correcto.")
        return False
    except Exception as e:
        logger.error(f"❌ Error generando esquema estático: {e}")
        import traceback
        traceback.print_exc()
        return False


def regenerate_frontend_client():
    """Ejecuta el generador de cliente (Orval) en el frontend."""
    logger.info("🚀 Regenerando cliente Frontend (Orval)...")

    if not FRONTEND_DIR.exists():
        logger.error(f"❌ Directorio frontend no encontrado: {FRONTEND_DIR}")
        return False

    # Comando npm
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    
    try:
        # Usamos encoding='utf-8' para evitar el crash de cp1252
        result = subprocess.run(
            [npm_cmd, "run", "generate:api"],
            cwd=FRONTEND_DIR,
            shell=True,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8"  # FIX CRÍTICO para Windows
        )
        print(result.stdout)
        logger.info("✅ Frontend regenerado exitosamente.")
        return True
    except subprocess.CalledProcessError as e:
        logger.error("❌ Error al regenerar frontend:")
        print(e.stderr) # Imprimir stderr directamente
        return False
    except Exception as e:
        logger.error(f"❌ Error inesperado ejecutando npm: {e}")
        return False


def restart_stack():
    """Reinicia el stack completo invocando stop y start."""
    logger.info("🔄 Reiniciando Stack Completo...")
    
    python_exe = sys.executable
    stop_script = PROJECT_ROOT / "stop.local.py"
    start_script = PROJECT_ROOT / "start.local.py"

    try:
        logger.info("1. Deteniendo servicios...")
        subprocess.run([python_exe, str(stop_script)], check=True)
        
        logger.info("2. Iniciando servicios...")
        # Start se lanza y libera, o bloquea? start.local.py actual bloquea si no tiene flag de daemon.
        # Asumimos que queremos lanzarlo en una ventana nueva o dejarlo corriendo.
        # Por simplicidad, ejecutamos y dejamos que el usuario maneje la ventana o proceso.
        subprocess.run([python_exe, str(start_script)], check=False)
    except Exception as e:
        logger.error(f"Error reiniciando stack: {e}")


def wait_for_backend_health(timeout=30):
    """Espera pasiva al backend via HTTP."""
    start = time.time()
    logger.info("⏳ Esperando health check del backend...")
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(BACKEND_LOG_URL) as response:
                if response.status == 200:
                    logger.info("✅ Backend Online.")
                    return True
        except:
            time.sleep(1)
    logger.warning("⚠️ Timeout esperando backend (pero continuamos)...")
    return False


def main():
    parser = argparse.ArgumentParser(description="Ecommerce Playground Dev Pipeline Automation")
    parser.add_argument("--static", action="store_true", help="Generar OpenAPI estáticamente (sin server)")
    parser.add_argument("--regen", action="store_true", help="Solo regenerar cliente frontend")
    parser.add_argument("--restart", action="store_true", help="Reiniciar todo el stack (Stop + Start)")
    
    args = parser.parse_args()

    print("\n==========================================")
    print(" 🛠️  ECOMMERCE PLAYGROUND DEV PIPELINE v2.0")
    print("==========================================\n")

    # 1. Generación de Schema (Static es más robusto)
    # Por defecto intentamos Static primero porque es más rápido y seguro.
    if args.static or (not args.regen and not args.restart):
        if not generate_static_schema():
            logger.warning("⚠️ Falló generación estática. Intentaremos método dinámico si el server corre.")

    # 2. Regeneración Frontend
    if args.regen or args.static or (not args.restart):
        regenerate_frontend_client()

    # 3. Restart Stack
    if args.restart:
        restart_stack()

    logger.info("✨ Pipeline finalizado.")


if __name__ == "__main__":
    main()
