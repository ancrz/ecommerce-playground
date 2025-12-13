#!/usr/bin/env python3
"""
scripts/regenerate.py - Regenerar Cliente API (v2.0)
=====================================================

Pipeline de regeneración:
1. OpenAPI schema → docs/openapi.json
2. Zod schemas → frontend/src/types.generated.ts
3. API helpers con códigos HTTP → frontend/src/api.generated.ts
4. Alembic migrations (opcional)

Este script mantiene la coherencia entre Backend y Frontend.

Uso:
    python -m scripts.regenerate              # Regeneración completa
    python -m scripts.regenerate --no-start   # No iniciar backend
    python -m scripts.regenerate --migrate    # Incluir migraciones
    python -m scripts.regenerate --validate   # Solo validar endpoints

Códigos HTTP soportados:
    200 OK, 201 Created, 204 No Content
    400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found
    422 Validation Error, 500 Internal Server Error
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
from typing import Optional, Dict, Any, List, Tuple, Set
from datetime import datetime

# --- Configuración ---
LOG_DIR = Path(__file__).parent.parent / "data" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Configurar logging con archivo
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_DIR / "regenerate.log", encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
FRONTEND_DIR = PROJECT_ROOT / "frontend"
DOCS_DIR = PROJECT_ROOT / "docs"

# Códigos HTTP que manejamos
HTTP_CODES = {
    200: "OK",
    201: "Created",
    204: "NoContent",
    400: "BadRequest",
    401: "Unauthorized",
    403: "Forbidden",
    404: "NotFound",
    422: "ValidationError",
    500: "InternalServerError",
}


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
    """Verifica si un puerto está en uso intentando conectar."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        try:
            s.connect(('127.0.0.1', port))
            return True  # Conexión exitosa = puerto en uso
        except (ConnectionRefusedError, TimeoutError, OSError):
            return False


def wait_for_backend(port: int, timeout: int = 30) -> bool:
    """Espera a que el backend responda en el endpoint de health."""
    import urllib.request
    
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(f"http://localhost:{port}/api/products", timeout=2) as response:
                if response.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False


def get_python_executable() -> str:
    """Obtiene el ejecutable de Python del venv."""
    venv_path = PROJECT_ROOT / ".venv" / ("Scripts" if os.name == "nt" else "bin") / "python"
    if os.name == "nt":
        venv_path = venv_path.with_suffix(".exe")
    return str(venv_path) if venv_path.exists() else sys.executable


def fetch_openapi_schema(port: int) -> Optional[Dict[str, Any]]:
    """Descarga el schema OpenAPI del backend."""
    import urllib.request
    import urllib.error
    
    url = f"http://localhost:{port}/openapi.json"
    
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            status = response.status
            if status != 200:
                logger.error(f"❌ OpenAPI respondió con código {status}")
                return None
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        logger.error(f"❌ HTTP Error {e.code}: {e.reason}")
        return None
    except Exception as e:
        logger.error(f"❌ Error descargando OpenAPI: {e}")
        return None


def validate_endpoints(schema: Dict[str, Any], port: int) -> List[Tuple[str, str, int, str]]:
    """
    Valida que todos los endpoints respondan correctamente.
    Retorna lista de (method, path, status_code, message).
    """
    import urllib.request
    import urllib.error
    
    results = []
    paths = schema.get("paths", {})
    
    logger.info(f"\n🔍 Validando {len(paths)} endpoints...")
    
    for path, methods in paths.items():
        for method in methods:
            if method in ("get", "post", "put", "delete", "patch"):
                # Solo validar GET sin parámetros requeridos
                if method == "get" and "{" not in path:
                    url = f"http://localhost:{port}{path}"
                    try:
                        req = urllib.request.Request(url, method=method.upper())
                        with urllib.request.urlopen(req, timeout=5) as response:
                            status = response.status
                            results.append((method.upper(), path, status, "OK"))
                    except urllib.error.HTTPError as e:
                        results.append((method.upper(), path, e.code, e.reason))
                    except Exception as e:
                        results.append((method.upper(), path, 0, str(e)))
    
    # Mostrar resultados
    errors = [r for r in results if r[2] >= 400 or r[2] == 0]
    success = [r for r in results if 200 <= r[2] < 400]
    
    logger.info(f"   ✓ {len(success)} endpoints OK")
    if errors:
        logger.warning(f"   ⚠️ {len(errors)} endpoints con errores:")
        for method, path, code, msg in errors[:5]:
            logger.warning(f"      {method} {path} → {code} {msg}")
    
    return results


def start_backend_temp() -> Optional[subprocess.Popen]:
    """Inicia el backend temporalmente para obtener el schema."""
    python = get_python_executable()
    port = int(os.getenv("BACKEND_PORT", "8042"))
    
    logger.info(f"🚀 Iniciando backend temporalmente en puerto {port}...")
    
    # Crear log file
    log_file = open(LOG_DIR / "backend_temp.log", "a", encoding="utf-8")
    
    proc = subprocess.Popen(
        [python, "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", str(port)],
        cwd=PROJECT_ROOT,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )
    
    # Esperar a que el backend responda
    if wait_for_backend(port, timeout=25):
        logger.info("✓ Backend iniciado y respondiendo")
        return proc
    
    proc.terminate()
    logger.error("❌ Backend no pudo iniciar")
    # Mostrar últimas líneas del log
    log_file.close()
    try:
        with open(LOG_DIR / "backend_temp.log", "r") as f:
            lines = f.readlines()[-10:]
            for line in lines:
                logger.error(f"   {line.strip()}")
    except:
        pass
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
    """Genera código Zod desde el schema OpenAPI."""
    lines = [
        "/**",
        " * types.generated.ts",
        f" * Generado automáticamente desde OpenAPI - {datetime.now().isoformat()}",
        " * NO EDITAR MANUALMENTE - Usar: python -m scripts.regenerate",
        " */",
        "",
        "import { z } from 'zod';",
        "",
        "// ========== HTTP Status Codes ==========",
        "",
    ]
    
    # Añadir constantes de códigos HTTP
    for code, name in HTTP_CODES.items():
        lines.append(f"export const HTTP_{name.upper()} = {code};")
    
    lines.append("")
    lines.append("// ========== API Schemas ==========")
    lines.append("")
    
    schemas = schema.get("components", {}).get("schemas", {})
    
    # --- Topological Sort ---
    def get_dependencies(definition: Any) -> Set[str]:
        """Extrae dependencias ($ref) de un schema recursivamente."""
        deps = set()
        if isinstance(definition, dict):
            if "$ref" in definition:
                ref = definition["$ref"]
                if ref.startswith("#/components/schemas/"):
                    deps.add(ref.split("/")[-1])
            for value in definition.values():
                deps.update(get_dependencies(value))
        elif isinstance(definition, list):
            for item in definition:
                deps.update(get_dependencies(item))
        return deps

    # Construir grafo de dependencias
    # graph: nombre -> set de dependencias directas
    graph = {name: get_dependencies(defi) for name, defi in schemas.items()}
    
    # Kahn's Algorithm para topological sort
    sorted_names = []
    # Nodos sin dependencias pendientes
    # (Inicialmente, aquellos cuyas dependencias ya están en 'visited' o no tienen)
    # Pero aquí es al revés: queremos emitir primero los que NO dependen de nadie (hojas)
    # OJO: Si A depende de B, B debe emitirse primero.
    
    # Vamos a usar una lista de "ya emitidos"
    emitted = set()
    while len(emitted) < len(schemas):
        progress = False
        remaining = [n for n in schemas if n not in emitted]
        
        # Ordenar alfabéticamente para determinismo en caso de empate
        remaining.sort()
        
        for name in remaining:
            deps = graph[name]
            # Si todas mis dependencias ya fueron emitidas (o son dependencias externas/ignoradas)
            # Ignoramos dependencias a uno mismo (recursión simple)
            real_deps = {d for d in deps if d in schemas and d != name}
            
            if real_deps.issubset(emitted):
                sorted_names.append(name)
                emitted.add(name)
                progress = True
        
        if not progress:
            # Ciclo detectado - Romper el ciclo arbitrariamente (o usar z.lazy después)
            # Tomamos el primero que quede para desbloquear
            logger.warning("⚠️ Ciclo de dependencia detectado en schemas. Rompiendo ciclo.")
            # Emitir todos los restantes (Zod fallará en runtime si no usamos lazy, pero es mejor que bucle infinito)
            unemitted = [n for n in schemas if n not in emitted]
            sorted_names.extend(unemitted)
            break
            
    # Iterar en orden topológico
    for name in sorted_names:
        definition = schemas[name]
        
        # Saltar schemas internos de FastAPI
        if name.startswith("HTTPValidation") or name.startswith("ValidationError"):
            continue
        if name.startswith("Body_"):  # Pydantic body wrappers
            continue
        
        lines.append(f"// Schema: {name}")
        try:
            # Pasamos 'emitted' (o sea 'sorted_names' hasta ahora) para saber si podemos referenciar directamente?
            # Por ahora confiamos en el orden.
            zod_schema = convert_schema_to_zod(definition, schemas, name)
            lines.append(f"export const {name}Schema = {zod_schema};")
            lines.append(f"export type {name} = z.infer<typeof {name}Schema>;")
        except Exception as e:
            lines.append(f"// ERROR generando schema: {e}")
            lines.append(f"export const {name}Schema = z.unknown();")
            lines.append(f"export type {name} = unknown;")
        lines.append("")
    
    return "\n".join(lines)


def convert_schema_to_zod(schema: Dict[str, Any], all_schemas: Dict, name: str = "") -> str:
    """Convierte un schema JSON a código Zod."""
    
    # Referencia a otro schema
    if "$ref" in schema:
        ref_name = schema["$ref"].split("/")[-1]
        return f"{ref_name}Schema"
    
    schema_type = schema.get("type")
    
    # Nullable
    nullable = schema.get("nullable", False)
    
    # Parche de Robustez Financiera: Pydantic v2 a veces emite float, OpenAPI dice string(decimal)
    financial_fields = [
        "price", "final_price", "subtotal", "tax_amount", 
        "total", "total_with_tax", "exchange_rate", 
        "rate", "discount_percentage", "amount"
    ]
    if name in financial_fields:
        base = "z.union([z.string(), z.number()])"
        if nullable:
            base += ".nullable()"
        return base

    # String
    if schema_type == "string":
        result = "z.string()"
        if schema.get("format") == "date-time":
            result = "z.string().datetime()"
        elif schema.get("format") == "email":
            result = "z.string().email()"
        elif schema.get("format") == "uuid":
            result = "z.string().uuid()"
        elif "enum" in schema:
            enum_values = ", ".join(f'"{v}"' for v in schema["enum"])
            result = f"z.enum([{enum_values}])"
        
        if nullable:
            result += ".nullable()"
        return result
    
    # Number/Integer
    if schema_type in ("integer", "number"):
        result = "z.number()"
        if schema_type == "integer":
            result += ".int()"
        if nullable:
            result += ".nullable()"
        return result
    
    # Boolean
    if schema_type == "boolean":
        result = "z.boolean()"
        if nullable:
            result += ".nullable()"
        return result
    
    # Array
    if schema_type == "array":
        items = schema.get("items", {})
        item_schema = convert_schema_to_zod(items, all_schemas)
        result = f"z.array({item_schema})"
        if nullable:
            result += ".nullable()"
        return result
    
    # Object
    if schema_type == "object":
        properties = schema.get("properties", {})
        required = set(schema.get("required", []))
        
        if not properties:
            return "z.object({}).passthrough()"
        
        fields = []
        for prop_name, prop_schema in properties.items():
            # Recursion: Pasamos prop_name como name
            prop_zod = convert_schema_to_zod(prop_schema, all_schemas, name=prop_name)
            if prop_name not in required:
                prop_zod += ".optional()"
            # Sanitize property name
            safe_name = prop_name if prop_name.isidentifier() else f'"{prop_name}"'
            fields.append(f"  {safe_name}: {prop_zod}")
        
        result = "z.object({\n" + ",\n".join(fields) + "\n})"
        if nullable:
            result += ".nullable()"
        return result
    
    # allOf / anyOf / oneOf
    if "allOf" in schema:
        parts = [convert_schema_to_zod(s, all_schemas) for s in schema["allOf"]]
        if len(parts) == 1:
            return parts[0]
        return f"{parts[0]}.merge({parts[1]})" if len(parts) == 2 else parts[0]
    
    if "anyOf" in schema:
        parts = []
        for s in schema["anyOf"]:
            if s.get("type") == "null":
                parts.append("z.null()")
            else:
                parts.append(convert_schema_to_zod(s, all_schemas))
        if len(parts) == 2 and "z.null()" in parts:
            other = [p for p in parts if p != "z.null()"][0]
            return f"{other}.nullable()"
        return f"z.union([{', '.join(parts)}])"
    
    # Default
    return "z.unknown()"


def generate_api_helpers(schema: Dict[str, Any]) -> str:
    """Genera helpers de API con manejo de errores HTTP."""
    lines = [
        "/**",
        " * api.generated.ts",
        f" * Generado automáticamente desde OpenAPI - {datetime.now().isoformat()}",
        " * NO EDITAR MANUALMENTE - Usar: python -m scripts.regenerate",
        " */",
        "",
        "import { z } from 'zod';",
        "import * as schemas from './types.generated';",
        "",
        "// ========== API Error Handler ==========",
        "",
        "export class ApiError extends Error {",
        "  constructor(",
        "    public status: number,",
        "    public statusText: string,",
        "    public body?: unknown",
        "  ) {",
        "    super(`HTTP ${status}: ${statusText}`);",
        "    this.name = 'ApiError';",
        "  }",
        "",
        "  is400() { return this.status === 400; }",
        "  is401() { return this.status === 401; }",
        "  is403() { return this.status === 403; }",
        "  is404() { return this.status === 404; }",
        "  is422() { return this.status === 422; }",
        "  is500() { return this.status >= 500; }",
        "}",
        "",
        "// ========== Response Handler ==========",
        "",
        "export async function handleResponse<T>(",
        "  response: Response,",
        "  schema?: z.ZodType<T>",
        "): Promise<T> {",
        "  if (!response.ok) {",
        "    let body: unknown;",
        "    try {",
        "      body = await response.json();",
        "    } catch {",
        "      body = await response.text();",
        "    }",
        "    throw new ApiError(response.status, response.statusText, body);",
        "  }",
        "",
        "  // 204 No Content",
        "  if (response.status === 204) {",
        "    return undefined as T;",
        "  }",
        "",
        "  const data = await response.json();",
        "",
        "  if (schema) {",
        "    return schema.parse(data);",
        "  }",
        "",
        "  return data as T;",
        "}",
        "",
        "// ========== Logging Helper ==========",
        "",
        "export function logApiError(error: unknown, context: string): void {",
        "  if (error instanceof ApiError) {",
        "    console.error(`[API ERROR] ${context}:`, {",
        "      status: error.status,",
        "      statusText: error.statusText,",
        "      body: error.body,",
        "    });",
        "  } else if (error instanceof Error) {",
        "    console.error(`[ERROR] ${context}:`, error.message);",
        "  } else {",
        "    console.error(`[ERROR] ${context}:`, error);",
        "  }",
        "}",
        "",
    ]
    
    return "\n".join(lines)


def save_generated_types(code: str) -> Path:
    """Guarda los tipos generados."""
    output_path = FRONTEND_DIR / "src" / "types.generated.ts"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(code)
    
    logger.info(f"✓ Tipos Zod generados en {output_path}")
    return output_path


def save_api_helpers(code: str) -> Path:
    """Guarda los helpers de API."""
    output_path = FRONTEND_DIR / "src" / "api.generated.ts"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(code)
    
    logger.info(f"✓ API helpers generados en {output_path}")
    return output_path


def run_alembic_autogenerate() -> bool:
    """Ejecuta alembic revision --autogenerate si hay cambios."""
    python = get_python_executable()
    alembic_ini = PROJECT_ROOT / "alembic.ini"
    
    if not alembic_ini.exists():
        logger.info("ℹ️ alembic.ini no encontrado - este proyecto usa SQLite con auto-create")
        return True
    
    logger.info("📦 Verificando cambios en modelos para migración...")
    
    try:
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



def generate_react_hooks(schema: Dict[str, Any]) -> str:
    """Genera React Hooks personalizados para cada endpoint."""
    lines = [
        "/**",
        " * hooks.generated.ts",
        f" * Generado automáticamente desde OpenAPI - {datetime.now().isoformat()}",
        " * NO EDITAR MANUALMENTE",
        " */",
        "",
        "import { useState, useEffect, useCallback } from 'react';",
        "import * as schemas from './types.generated';",
        "import { handleResponse, ApiError } from './api.generated';",
        "import { config } from './config';",
        "",
        "// Tipos genéricos de Hook",
        "interface QueryState<T> {",
        "  data: T | null;",
        "  loading: boolean;",
        "  error: ApiError | Error | null;",
        "  refetch: () => Promise<void>;",
        "}",
        "",
        "interface MutationState<T, B> {",
        "  data: T | null;",
        "  loading: boolean;",
        "  error: ApiError | Error | null;",
        "  mutate: (body: B) => Promise<T>;",
        "}",
        "",
        "const BASE_URL = ''; // Paths de OpenAPI ya incluyen prefijo",
        "",
    ]
    
    paths = schema.get("paths", {})
    
    for path, methods in paths.items():
        for method, operation in methods.items():
            if method not in ("get", "post", "put", "delete", "patch"):
                continue
            
            operation_id = operation.get("operationId", "")
            if not operation_id:
                # Generar nombre si no existe (ej: get_users)
                clean_path = path.replace("/", "_").replace("{", "").replace("}", "")
                operation_id = f"{method}{clean_path}"
            
            # Convertir snake_case a CamelCase para el nombre del hook
            # get_all_users -> useGetAllUsers
            parts = operation_id.split("_")
            hook_name = "use" + "".join(p.capitalize() for p in parts)
            
            # Detectar tipos de response y request
            response_schema = "z.unknown()"
            response_type = "unknown"
            
            # Buscar respuesta exitosa
            for code in ("200", "201"):
                if code in operation.get("responses", {}):
                    content = operation["responses"][code].get("content", {})
                    if "application/json" in content:
                        schema_ref = content["application/json"]["schema"]
                        if "$ref" in schema_ref:
                            type_name = schema_ref["$ref"].split("/")[-1]
                            response_schema = f"schemas.{type_name}Schema"
                            response_type = f"schemas.{type_name}"
            
            # Buscar request body (para mutaciones)
            body_type = "unknown"
            has_body = False
            if "requestBody" in operation:
                content = operation["requestBody"].get("content", {})
                if "application/json" in content:
                    has_body = True
                    schema_ref = content["application/json"]["schema"]
                    if "$ref" in schema_ref:
                        type_name = schema_ref["$ref"].split("/")[-1]
                        body_type = f"schemas.{type_name}"
            
            # Generar Hook
            summary = operation.get("summary", "Sin descripción")
            lines.append(f"/** {summary} */")
            
            # GET (Query)
            if method == "get":
                # Detectar parámetros de ruta
                path_params = [p for p in operation.get("parameters", []) if p["in"] == "path"]
                params_args = ", ".join(f"{p['name']}: string" for p in path_params)
                url_expr = f"`${{BASE_URL}}{path.replace('{', '${')}`"
                
                lines.append(f"export function {hook_name}({params_args}) {{")
                lines.append(f"  const [state, setState] = useState<QueryState<{response_type}>>({{")
                lines.append("    data: null, loading: true, error: null, refetch: async () => {}")
                lines.append("  });")
                lines.append("")
                lines.append("  const fetchData = useCallback(async () => {")
                lines.append("    setState(prev => ({ ...prev, loading: true, error: null }));")
                lines.append("    try {")
                lines.append(f"      const res = await fetch({url_expr}, {{")
                lines.append("        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }")
                lines.append("      });")
                lines.append(f"      const data = await handleResponse(res, {response_schema});")
                lines.append("      setState({ data, loading: false, error: null, refetch: fetchData });")
                lines.append("    } catch (err) {")
                lines.append("      setState(prev => ({ ...prev, loading: false, error: err as Error }));")
                lines.append("    }")
                lines.append(f"  }}, [{', '.join(p['name'] for p in path_params)}]);")
                lines.append("")
                lines.append("  useEffect(() => { fetchData(); }, [fetchData]);")
                lines.append("")
                lines.append("  return state;")
                lines.append("}")
            
            # Mutations (POST, PUT, DELETE)
            else:
                path_params = [p for p in operation.get("parameters", []) if p["in"] == "path"]
                params_args = ", ".join(f"{p['name']}: string" for p in path_params)
                params_comma = ", " if params_args else ""
                url_expr = f"`${{BASE_URL}}{path.replace('{', '${')}`"
                
                lines.append(f"export function {hook_name}({params_args}) {{")
                lines.append(f"  const [state, setState] = useState<MutationState<{response_type}, {body_type}>>({{")
                lines.append("    data: null, loading: false, error: null, mutate: async () => null as any")
                lines.append("  });")
                lines.append("")
                lines.append(f"  const mutate = async (body{':' if has_body else '?:'} {body_type}) => {{")
                lines.append("    setState(prev => ({ ...prev, loading: true, error: null }));")
                lines.append("    try {")
                lines.append(f"      const res = await fetch({url_expr}, {{")
                lines.append(f"        method: '{method.upper()}',")
                lines.append("        headers: {")
                lines.append("          'Content-Type': 'application/json',")
                lines.append("          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`")
                lines.append("        },")
                lines.append(f"        body: {'JSON.stringify(body)' if has_body else 'undefined'}")
                lines.append("      });")
                lines.append(f"      const data = await handleResponse(res, {response_schema});")
                lines.append("      setState({ data, loading: false, error: null, mutate });")
                lines.append("      return data;")
                lines.append("    } catch (err) {")
                lines.append("      setState(prev => ({ ...prev, loading: false, error: err as Error }));")
                lines.append("      throw err;")
                lines.append("    }")
                lines.append("  };")
                lines.append("")
                lines.append("  return { ...state, mutate };")
                lines.append("}")
            
            lines.append("")
    
    return "\n".join(lines)


def save_hooks(code: str) -> Path:
    """Guarda los hooks generados."""
    output_path = FRONTEND_DIR / "src" / "hooks.generated.ts"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(code)
    logger.info(f"✓ Hooks generados en {output_path}")
    return output_path


def main():
    """Entry point principal."""
    parser = argparse.ArgumentParser(description="Regenerar cliente API")
    parser.add_argument("--no-start", action="store_true", help="No iniciar backend si no está corriendo")
    parser.add_argument("--migrate", action="store_true", help="Ejecutar autogenerate de migraciones")
    parser.add_argument("--no-types", action="store_true", help="No generar tipos TypeScript")
    parser.add_argument("--validate", action="store_true", help="Solo validar endpoints sin regenerar")
    # Argumento implícito: siempre genera hooks si genera types
    args = parser.parse_args()
    
    print("\n>>> Regenerando Cliente API <<<\n")
    logger.info(f"Log file: {LOG_DIR / 'regenerate.log'}")
    
    # Cargar configuración
    load_env()
    
    backend_port = int(os.getenv("BACKEND_PORT", "8042"))
    backend_started = False
    backend_proc = None
    
    # Verificar si backend está corriendo
    if not is_port_in_use(backend_port):
        if args.no_start:
            logger.error(f"❌ Backend no está corriendo en puerto {backend_port}")
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
            logger.error("❌ No se pudo obtener el schema OpenAPI")
            return 1
        
        # Contar endpoints y schemas
        paths_count = len(schema.get("paths", {}))
        schemas_count = len(schema.get("components", {}).get("schemas", {}))
        logger.info(f"   Paths: {paths_count}, Schemas: {schemas_count}")
        
        # Solo validar si se pide
        if args.validate:
            results = validate_endpoints(schema, backend_port)
            errors = len([r for r in results if r[2] >= 400 or r[2] == 0])
            return 1 if errors > 0 else 0
        
        # 2. Guardar schema OpenAPI
        save_openapi_schema(schema)
        
        # 3. Generar Código Frontend
        if not args.no_types:
            # Tipos Zod
            logger.info("\n⚙️ Generando tipos Zod...")
            zod_code = generate_zod_types_from_openapi(schema)
            save_generated_types(zod_code)
            
            # API Helpers
            logger.info("\n⚙️ Generando API helpers...")
            api_code = generate_api_helpers(schema)
            save_api_helpers(api_code)
            
            # React Hooks
            logger.info("\n⚙️ Generando React Hooks...")
            hooks_code = generate_react_hooks(schema)
            save_hooks(hooks_code)
        
        # 5. Validar endpoints (después de generar, para aprovechar tiempo)
        validate_endpoints(schema, backend_port)
        
        # 6. Ejecutar migraciones
        if args.migrate:
            logger.info("\n📦 Ejecutando migraciones...")
            run_alembic_autogenerate()
        
        # Resumen final
        logger.info("\n" + "=" * 60)
        logger.info("✅ Regeneración completada")
        logger.info("=" * 60)
        logger.info("")
        logger.info("Archivos generados:")
        logger.info(f"  - docs/openapi.json")
        if not args.no_types:
            logger.info(f"  - frontend/src/types.generated.ts")
            logger.info(f"  - frontend/src/api.generated.ts")
            logger.info(f"  - frontend/src/hooks.generated.ts")
        logger.info("")
        logger.info(f"Log: {LOG_DIR / 'regenerate.log'}")
        
        return 0
        
    finally:
        if backend_started and backend_proc:
            logger.info("🛑 Deteniendo backend temporal...")
            backend_proc.terminate()
            try:
                backend_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                backend_proc.kill()


if __name__ == "__main__":
    sys.exit(main())
