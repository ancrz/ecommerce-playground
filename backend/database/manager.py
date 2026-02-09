"""
Gestor de Base de Datos Híbrido (SQLite y Postgres)
REFACTORIZADO:
- Detecta automáticamente el tipo de DB (sqlite o postgres) usando la variable de entorno DB_TYPE.
- Usa 'asyncpg' para Postgres (en Docker) y 'aiosqlite' para SQLite (en local).
- Los esquemas SQL han sido migrados a Postgres (usando JSONB, SERIAL, etc.).
- Las funciones de acceso (execute, fetchall) son agnósticas al tipo de DB.
"""

import logging
import os
from pathlib import Path
from typing import Any

import aiosqlite

logger = logging.getLogger(__name__)

# --- Configuración del Motor de Base de Datos ---
DB_TYPE = os.getenv("DB_TYPE", "sqlite")

# Conditionally import asyncpg
if DB_TYPE == "postgres":
    try:
        import asyncpg
    except ImportError:
        logger.error("asyncpg no está instalado. Por favor, instálalo para usar el modo PostgreSQL.")
        raise

# --- Esquemas SQL ---
# Estos esquemas están escritos para POSTGRESQL.
# La lógica de inicialización de SQLite los adaptará.


# Función para convertir una fila (Row) de asyncpg o aiosqlite a un dict
def row_to_dict(row: Any) -> dict[str, Any] | None:
    if not row:
        return None
    # asyncpg.Record y aiosqlite.Row se pueden convertir a dict
    return dict(row)


# Define los esquemas SQL para POSTGRES
# (Solo mantenemos DAILY_CLOSURES y BUSINESS_INFO que aún no son SQLModel completo)
_SCHEMAS_POSTGRES = {
    "daily_closures": [
        """
        CREATE TABLE IF NOT EXISTS daily_closures (
            id SERIAL PRIMARY KEY,
            date DATE NOT NULL UNIQUE,
            total_sales NUMERIC(12, 2) NOT NULL,
            sales_count INTEGER NOT NULL,
            summary JSONB,
            closed_by VARCHAR(100),
            closed_at TIMESTAMPTZ NOT NULL
        );
    """
    ],
    "business": [
        """
        CREATE TABLE IF NOT EXISTS business_info (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT NOT NULL DEFAULT 'E-Commerce',
            rif TEXT,
            contact TEXT,
            social_networks JSONB DEFAULT '[]',
            logo_url TEXT,
            icon_url TEXT,
            updated_at TIMESTAMPTZ NOT NULL
        );
    """,
        """
        INSERT INTO business_info (id, name, social_networks, updated_at) 
        VALUES (1, 'E-Commerce', '[]', CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
    """,
    ],
    "customization": [
        """
        CREATE TABLE IF NOT EXISTS customization (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            primary_color TEXT NOT NULL DEFAULT '#264192',
            secondary_color TEXT NOT NULL DEFAULT '#ffdd00',
            accent_color TEXT NOT NULL DEFAULT '#ffffff',
            font_family TEXT NOT NULL DEFAULT 'Poppins',
            custom_css TEXT,
            updated_at TIMESTAMPTZ NOT NULL,
            icon_products_url TEXT,
            icon_business_url TEXT,
            icon_customization_url TEXT,
            icon_finance_url TEXT,
            icon_sales_url TEXT,
            icon_users_url TEXT,
            icon_tax_url TEXT
        );
    """,
        """
        INSERT INTO customization (id, primary_color, secondary_color, accent_color, font_family, updated_at) 
        VALUES (1, '#264192', '#ffdd00', '#ffffff', 'Poppins', CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
    """,
    ],
}

# Define los "chunks" (archivos de base de datos separados)
# ESTO SÓLO SE USA EN MODO SQLITE
_DBS_SQLITE = {
    "products": "ecommerce.db",
    "cart": "ecommerce.db",
    "sales": "ecommerce.db",
    "finance": "ecommerce.db",
    "business": "ecommerce.db",
    "customization": "ecommerce.db",
    "roles": "ecommerce.db",
    "users": "ecommerce.db",
    "tax": "ecommerce.db",
    "password_tokens": "ecommerce.db",
    "customers": "ecommerce.db",
}

# Esquemas adaptados para SQLite (unificado)
_SCHEMAS_SQLITE = {
    "business": [
        s.replace("JSONB", "TEXT")
        .replace("TIMESTAMPTZ", "TEXT")
        .replace("ON CONFLICT (id) DO NOTHING", "ON CONFLICT(id) DO NOTHING")
        for s in _SCHEMAS_POSTGRES["business"]
    ],
    "customization": [
        s.replace("TIMESTAMPTZ", "TEXT").replace("ON CONFLICT (id) DO NOTHING", "ON CONFLICT(id) DO NOTHING")
        for s in _SCHEMAS_POSTGRES["customization"]
    ],
}


class DatabaseManager:
    """
    Gestor de conexiones de base de datos unificado (Postgres optimizado o SQLite).
    """

    def __init__(self, base_path: str = "./data/database"):
        self.is_initialized = False

        if DB_TYPE == "postgres":
            # Construye la URL de conexión de Postgres
            user = os.getenv("DB_USER", "admin")
            password = os.getenv("DB_PASS", "admin2024")
            host = os.getenv("DB_HOST", "localhost")
            port = os.getenv("DB_PORT", "5432")
            name = os.getenv("DB_NAME", "ecommerce_unified")

            self.db_url = f"postgresql://{user}:{password}@{host}:{port}/{name}"
            self._pool: asyncpg.Pool | None = None
            logger.info(f"DatabaseManager inicializado en modo POSTGRES (host: {host})")
        else:
            # Lógica de SQLite (modo local unificado)
            self.base_path = Path(base_path)
            self.base_path.mkdir(parents=True, exist_ok=True)
            self._connections: dict[str, aiosqlite.Connection] = {}
            logger.info(f"DatabaseManager inicializado en modo SQLITE (unificado en {base_path})")

    async def initialize(self):
        """Enciende las conexiones y verifica esquemas."""
        if self.is_initialized:
            return

        if DB_TYPE == "postgres":
            try:
                # OPTIMIZACIÓN: Pool de conexiones con settings de performance
                self._pool = await asyncpg.create_pool(
                    self.db_url, min_size=5, max_size=20, max_queries=1000, max_inactive_connection_lifetime=300
                )
                logger.info("Pool de PostgreSQL conectado (min:5, max:20).")

                # Aplicar esquemas manuales (DAILY_CLOSURES, etc.)
                async with self._pool.acquire() as conn:
                    for _chunk_name, schemas in _SCHEMAS_POSTGRES.items():
                        for schema in schemas:
                            await conn.execute(schema)
                logger.info("Esquemas manuales de PostgreSQL verificados.")
            except Exception as e:
                logger.error(f"Error fatal inicializando PostgreSQL: {e}")
                raise
        else:
            # Lógica SQLite unificada
            db_path = self.base_path / "ecommerce.db"
            try:
                conn = await aiosqlite.connect(db_path)
                conn.row_factory = aiosqlite.Row
                await conn.execute("PRAGMA journal_mode=WAL;")
                await conn.execute("PRAGMA synchronous=NORMAL;")

                # Mapear todos los chunks a la misma conexión
                for chunk_name in _DBS_SQLITE.keys():
                    self._connections[chunk_name] = conn

                # Aplicar esquemas manuales
                for _chunk_name, schemas in _SCHEMAS_SQLITE.items():
                    for schema in schemas:
                        try:
                            await conn.execute(schema)
                        except Exception as e:
                            if "duplicate column" not in str(e).lower():
                                logger.warning(f"Aviso esquema manual SQLite: {e}")

                await conn.commit()
                logger.info(f"Base de datos SQLite unificada y lista: {db_path}")
            except Exception as e:
                logger.error(f"Error inicializando SQLite unificada: {e}")
                raise

        self.is_initialized = True
        logger.info("DatabaseManager listo.")

    async def close(self):
        """Cierra todas las conexiones activas."""
        logger.info("Cerrando conexiones de DatabaseManager...")
        if DB_TYPE == "postgres":
            if self._pool:
                await self._pool.close()
                logger.info("Pool de PostgreSQL cerrado.")
        else:
            for chunk_name, conn in self._connections.items():
                try:
                    await conn.close()
                    logger.info(f"Chunk (SQLite) '{chunk_name}' [desconectado]")
                except Exception as e:
                    logger.error(f"Error cerrando chunk (SQLite) '{chunk_name}': {e}", exc_info=True)
        self.is_initialized = False

    async def _get_connection(self, chunk_name: str) -> Any:
        """
        Método privado para obtener la conexión/pool correcto.
        El concepto de "chunk" solo se aplica a SQLite.
        """
        if not self.is_initialized:
            logger.error("DatabaseManager no inicializado. Llamada a _get_connection() denegada.")
            raise RuntimeError("El gestor de base de datos no ha sido inicializado.")

        if DB_TYPE == "postgres":
            if not self._pool:
                raise RuntimeError("El pool de PostgreSQL no está inicializado.")
            return self._pool  # Devuelve el pool completo
        else:
            conn = self._connections.get(chunk_name)
            if conn is None:
                logger.error(f"Se solicitó un chunk (SQLite) desconocido: '{chunk_name}'")
                raise KeyError(f"No existe un chunk de base de datos (SQLite) llamado '{chunk_name}'")
            return conn  # Devuelve la conexión específica de aiosqlite

    # --- Métodos de acceso a datos agnósticos ---

    async def fetchone(self, chunk_name: str, query: str, params: tuple = ()) -> dict[str, Any] | None:
        """Ejecuta un SELECT y devuelve una sola fila como dict."""

        # Adapta los placeholders de ? (SQLite) a $1, $2 (Postgres)
        original_query = query
        if DB_TYPE == "postgres":
            query = self._adapt_query(query, params)

        db = await self._get_connection(chunk_name)

        try:
            if DB_TYPE == "postgres":
                # asyncpg usa *params, no una tupla
                row = await db.fetchrow(query, *params)
            else:
                async with db.execute(query, params) as cursor:
                    row = await cursor.fetchone()

            return row_to_dict(row)
        except Exception as e:
            logger.error(
                f"Error en fetchone (chunk: {chunk_name}, DB: {DB_TYPE}): {e}\nQuery: {original_query}\nParams: {params}",
                exc_info=True,
            )
            raise

    async def fetchall(self, chunk_name: str, query: str, params: tuple = ()) -> list[dict[str, Any]]:
        """Ejecuta un SELECT y devuelve todas las filas como lista de dicts."""

        original_query = query
        if DB_TYPE == "postgres":
            query = self._adapt_query(query, params)

        db = await self._get_connection(chunk_name)

        try:
            if DB_TYPE == "postgres":
                rows = await db.fetch(query, *params)
            else:
                async with db.execute(query, params) as cursor:
                    rows = await cursor.fetchall()

            # Ensure row_to_dict doesn't return None here, or filter it out.
            # aiosqlite/asyncpg rows are generally not None if fetched.
            return [d for r in rows if (d := row_to_dict(r)) is not None]
        except Exception as e:
            logger.error(
                f"Error en fetchall (chunk: {chunk_name}, DB: {DB_TYPE}): {e}\nQuery: {original_query}\nParams: {params}",
                exc_info=True,
            )
            raise

    async def execute(self, chunk_name: str, query: str, params: tuple = ()):
        """Ejecuta una operación de escritura (INSERT, UPDATE, DELETE) y hace commit."""

        original_query = query
        if DB_TYPE == "postgres":
            query = self._adapt_query(query, params)

        db = await self._get_connection(chunk_name)

        try:
            if DB_TYPE == "postgres":
                # asyncpg maneja las transacciones a nivel de pool/conexión,
                # no se necesita commit explícito aquí.
                await db.execute(query, *params)
            else:
                await db.execute(query, params)
                await db.commit()
        except Exception as e:
            # Captura errores de 'CHECK' (stock negativo) o 'UNIQUE' (username, email)
            # y otros errores de base de datos.
            logger.error(f"Error de base de datos en chunk '{chunk_name}': {e}. Query: {original_query}")
            # Re-lanza como ValueError para que los servicios lo manejen
            raise ValueError(f"Error de base de datos: {e}") from e

    def _adapt_query(self, query: str, params: tuple) -> str:
        """
        Convierte placeholders de '?' (SQLite) a '$1', '$2', etc. (Postgres).
        """
        if DB_TYPE != "postgres":
            return query

        count = query.count("?")
        if count == 0 and len(params) == 0:
            return query

        if count != len(params):
            logger.warning(f"Desajuste de placeholders '?' ({count}) y params ({len(params)}) en query: {query}")
            # Aún así, intenta la conversión, puede ser un falso positivo
            count = len(params)
            if count == 0:
                return query

        # Reemplaza '?' secuencialmente con $1, $2...
        parts = query.split("?")
        if len(parts) != count + 1:
            # Caso complejo (ej. '?' en un string literal). No hacer nada.
            logger.warning(f"No se pudo adaptar la query (conteo de '?' falló), se usará tal cual: {query}")
            return query

        new_query = []
        for i, part in enumerate(parts[:-1]):
            new_query.append(part)
            new_query.append(f"${i + 1}")
        new_query.append(parts[-1])

        return "".join(new_query)
