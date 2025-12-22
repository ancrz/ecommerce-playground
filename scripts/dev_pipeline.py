import os
import subprocess
import time
import sys
import urllib.request
import logging

# Configuración
BACKEND_URL = "http://127.0.0.1:8042"
OPENAPI_URL = f"{BACKEND_URL}/openapi.json"
HEALTH_URL = f"{BACKEND_URL}/api/health"
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("DevPipeline")

def wait_for_backend(timeout=60):
    logger.info("⏳ Esperando a que el backend esté listo...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(HEALTH_URL) as response:
                if response.status == 200:
                    logger.info("✅ Backend listo.")
                    return True
        except Exception:
            try:
                # Intento fallback a openapi.json si health falla
                with urllib.request.urlopen(OPENAPI_URL) as response:
                     if response.status == 200:
                        logger.info("✅ Backend listo (OpenAPI accesible).")
                        return True
            except:
                pass
        time.sleep(2)
        print(".", end="", flush=True)
    
    logger.error("\n❌ Backend no respondió a tiempo.")
    return False

def regenerate_frontend():
    logger.info("🚀 Regenerando cliente Frontend con Orval...")
    
    # Asegurar que estamos en el directorio frontend
    if not os.path.exists(FRONTEND_DIR):
        logger.error(f"❌ Directorio frontend no encontrado: {FRONTEND_DIR}")
        return False
        
    try:
        # Ejecutar npm run generate:api
        # Shell=True para Windows compatibility con npm command
        result = subprocess.run(
            ["npm", "run", "generate:api"], 
            cwd=FRONTEND_DIR, 
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        logger.info(result.stdout)
        logger.info("✅ Frontend regenerado exitosamente.")
        return True
    except subprocess.CalledProcessError as e:
        logger.error("❌ Error al regenerar frontend:")
        logger.error(e.stderr)
        return False

def main():
    logger.info(">>> PIPELINE DE DESARROLLO (SCHEMA-DRIVEN) <<<")
    
    # 1. Verificar Backend
    if not wait_for_backend():
        sys.exit(1)
        
    # 2. Regenerar Frontend
    if not regenerate_frontend():
        sys.exit(1)
        
    logger.info("✅ Pipeline completado.")

if __name__ == "__main__":
    main()
