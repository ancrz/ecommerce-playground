#!/usr/bin/env python3
"""
scripts/regenerate.py - Regenerar Cliente API
==============================================

Este script:
1. Verifica que el backend esté corriendo (o lo inicia temporalmente)
2. Descarga el schema OpenAPI del backend
3. Genera/actualiza los schemas Zod del frontend
4. Ejecuta migraciones de Alembic si hay cambios

Uso:
    python -m scripts.regenerate [--no-start] [--migrate]

Requiere:
    - Backend corriendo en BACKEND_PORT
    - O permiso para iniciarlo temporalmente
"""

import sys
import os
import json
import subprocess
import time
import logging
import argparse
import socket
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

# --- Configuración ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
FRONTEND_DIR = PROJECT_ROOT / "frontend"
DOCS_DIR = PROJECT_ROOT / "docs"


def load_env():
    """Carga variables de entorno desde .env."""
    env_file = PROJECT_ROOT / ".env"
    
    if not env_file.exists():
        return
    
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value


def is_port_in_use(port: int) -> bool:
    """Verifica si un puerto está en uso."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', port))
            return False
        except OSError:
            return True


def get_python_executable() -> str:
    """Obtiene el ejecutable de Python del venv."""
    venv_path = PROJECT_ROOT / ".venv" / ("Scripts" if os.name == "nt" else "bin") / "python"
    if os.name == "nt":
        venv_path = venv_path.with_suffix(".exe")
    return str(venv_path) if venv_path.exists() else sys.executable


def fetch_openapi_schema(port: int) -> Optional[Dict[str, Any]]:
    """Descarga el schema OpenAPI del backend."""
    import urllib.request
    
    url = f"http://localhost:{port}/openapi.json"
    
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        logger.error(f"❌ Error descargando OpenAPI: {e}")
        return None


def start_backend_temp() -> Optional[subprocess.Popen]:
    """Inicia el backend temporalmente para obtener el schema."""
    python = get_python_executable()
    port = int(os.getenv("BACKEND_PORT", "8042"))
    
    logger.info(f"🚀 Iniciando backend temporalmente en puerto {port}...")
    
    proc = subprocess.Popen(
        [python, "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", str(port)],
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )
    
    # Esperar a que inicie
    for _ in range(20):
        time.sleep(1)
        if is_port_in_use(port):
            logger.info("✓ Backend iniciado")
            return proc
    
    proc.terminate()
    logger.error("❌ Backend no pudo iniciar")
    return None


def save_openapi_schema(schema: Dict[str, Any]) -> Path:
    """Guarda el schema OpenAPI en docs/."""
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    
    output_path = DOCS_DIR / "openapi.json"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)
    
    logger.info(f"✓ OpenAPI guardado en {output_path}")
    return output_path


def generate_zod_types_from_openapi(schema: Dict[str, Any]) -> str:
    """
    Genera código Zod desde el schema OpenAPI.
    
    Esta es una implementación simplificada. Para producción,
    considera usar openapi-zod-client o similar.
    """
    lines = [
        "/**",
        " * types.generated.ts",
        f" * Generado automáticamente desde OpenAPI - {datetime.now().isoformat()}",
        " * NO EDITAR MANUALMENTE",
        " */",
        "",
        "import { z } from 'zod';",
        "",
    ]
    
    schemas = schema.get("components", {}).get("schemas", {})
    
    for name, definition in schemas.items():
        # Saltar schemas internos de FastAPI
        if name.startswith("HTTPValidation") or name.startswith("ValidationError"):
            continue
        
        lines.append(f"// Schema: {name}")
        zod_schema = convert_schema_to_zod(definition, schemas, name)
        lines.append(f"export const {name}Schema = {zod_schema};")
        lines.append(f"export type {name} = z.infer<typeof {name}Schema>;")
        lines.append("")
    
    return "\n".join(lines)


def convert_schema_to_zod(schema: Dict[str, Any], all_schemas: Dict, name: str = "") -> str:
    """Convierte un schema JSON a código Zod."""
    
    # Referencia a otro schema
    if "$ref" in schema:
        ref_name = schema["$ref"].split("/")[-1]
        return f"{ref_name}Schema"
    
    schema_type = schema.get("type")
    
    # String
    if schema_type == "string":
        if schema.get("format") == "date-time":
            return "z.string().datetime()"
        if schema.get("format") == "email":
            return "z.string().email()"
        if "enum" in schema:
            enum_values = ", ".join(f'"{v}"' for v in schema["enum"])
            return f"z.enum([{enum_values}])"
        return "z.string()"
    
    # Number/Integer
    if schema_type in ("integer", "number"):
        base = "z.number()"
        if schema_type == "integer":
            base += ".int()"
        return base
    
    # Boolean
    if schema_type == "boolean":
        return "z.boolean()"
    
    # Array
    if schema_type == "array":
        items = schema.get("items", {})
        item_schema = convert_schema_to_zod(items, all_schemas)
        return f"z.array({item_schema})"
    
    # Object
    if schema_type == "object":
        properties = schema.get("properties", {})
        required = set(schema.get("required", []))
        
        if not properties:
            return "z.object({})"
        
        fields = []
        for prop_name, prop_schema in properties.items():
            prop_zod = convert_schema_to_zod(prop_schema, all_schemas)
            if prop_name not in required:
                prop_zod += ".optional()"
            fields.append(f"  {prop_name}: {prop_zod}")
        
        return "z.object({\n" + ",\n".join(fields) + "\n})"
    
    # allOf / anyOf / oneOf
    if "allOf" in schema:
        parts = [convert_schema_to_zod(s, all_schemas) for s in schema["allOf"]]
        if len(parts) == 1:
            return parts[0]
        return f"{parts[0]}.merge({parts[1]})" if len(parts) == 2 else parts[0]
    
    if "anyOf" in schema:
        parts = [convert_schema_to_zod(s, all_schemas) for s in schema["anyOf"]]
        return f"z.union([{', '.join(parts)}])"
    
    # Default
    return "z.unknown()"


def save_generated_types(code: str) -> Path:
    """Guarda los tipos generados."""
    output_path = FRONTEND_DIR / "src" / "types.generated.ts"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(code)
    
    logger.info(f"✓ Tipos Zod generados en {output_path}")
    return output_path


def run_alembic_autogenerate() -> bool:
    """Ejecuta alembic revision --autogenerate si hay cambios."""
    python = get_python_executable()
    alembic_ini = PROJECT_ROOT / "alembic.ini"
    
    if not alembic_ini.exists():
        logger.info("ℹ️ alembic.ini no encontrado, saltando autogenerate")
        return True
    
    logger.info("📦 Verificando cambios en modelos para migración...")
    
    try:
        # Primero verificar si hay cambios pendientes
        result = subprocess.run(
            [python, "-m", "alembic", "check"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if "No new upgrade operations detected" in result.stdout:
            logger.info("✓ No hay cambios de modelo pendientes")
            return True
        
        # Generar migración
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result = subprocess.run(
            [python, "-m", "alembic", "revision", "--autogenerate", "-m", f"auto_{timestamp}"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            logger.info(f"✓ Migración generada: auto_{timestamp}")
            
            # Aplicar migración
            subprocess.run(
                [python, "-m", "alembic", "upgrade", "head"],
                cwd=PROJECT_ROOT,
                timeout=60
            )
            logger.info("✓ Migración aplicada")
            return True
        else:
            logger.warning(f"⚠️ Error generando migración: {result.stderr}")
            return False
            
    except Exception as e:
        logger.warning(f"⚠️ Error en Alembic: {e}")
        return False


def main():
    """Entry point principal."""
    parser = argparse.ArgumentParser(description="Regenerar cliente API")
    parser.add_argument("--no-start", action="store_true", 
                       help="No iniciar backend si no está corriendo")
    parser.add_argument("--migrate", action="store_true",
                       help="Ejecutar autogenerate de migraciones")
    parser.add_argument("--no-types", action="store_true",
                       help="No generar tipos TypeScript")
    args = parser.parse_args()
    
    print("\n>>> Regenerando Cliente API <<<\n")
    
    # Cargar configuración
    load_env()
    
    backend_port = int(os.getenv("BACKEND_PORT", "8042"))
    backend_started = False
    backend_proc = None
    
    # Verificar si backend está corriendo
    if not is_port_in_use(backend_port):
        if args.no_start:
            logger.error(f"❌ Backend no está corriendo en puerto {backend_port}")
            logger.error("   Inicia el backend o quita la opción --no-start")
            return 1
        
        backend_proc = start_backend_temp()
        if not backend_proc:
            return 1
        backend_started = True
    else:
        logger.info(f"✓ Backend detectado en puerto {backend_port}")
    
    try:
        # 1. Descargar OpenAPI
        logger.info("\n📥 Descargando schema OpenAPI...")
        schema = fetch_openapi_schema(backend_port)
        
        if not schema:
            return 1
        
        # 2. Guardar schema
        save_openapi_schema(schema)
        
        # 3. Generar tipos TypeScript/Zod
        if not args.no_types:
            logger.info("\n⚙️ Generando tipos Zod...")
            zod_code = generate_zod_types_from_openapi(schema)
            save_generated_types(zod_code)
        
        # 4. Ejecutar migraciones
        if args.migrate:
            logger.info("\n📦 Ejecutando migraciones...")
            run_alembic_autogenerate()
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ Regeneración completada")
        logger.info("=" * 60)
        logger.info("")
        logger.info("Archivos generados:")
        logger.info(f"  - docs/openapi.json")
        if not args.no_types:
            logger.info(f"  - frontend/src/types.generated.ts")
        logger.info("")
        
        return 0
        
    finally:
        # Limpiar: detener backend si lo iniciamos
        if backend_started and backend_proc:
            logger.info("🛑 Deteniendo backend temporal...")
            backend_proc.terminate()
            try:
                backend_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                backend_proc.kill()


if __name__ == "__main__":
    sys.exit(main())
