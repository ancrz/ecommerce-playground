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
# (usando JSONB, SERIAL, NUMERIC, BOOLEAN)
_SCHEMAS_POSTGRES = {
    "products": [
        """
        CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            sku VARCHAR(100) UNIQUE,
            price NUMERIC(10, 2) NOT NULL,
            stock INTEGER DEFAULT 0 CHECK(stock >= 0),
            category VARCHAR(100),
            image_url TEXT,
            is_featured BOOLEAN DEFAULT false,
            is_discount BOOLEAN DEFAULT false,
            discount_percentage NUMERIC(5, 2) DEFAULT 0,
            banner_assignment VARCHAR(50) DEFAULT 'main',
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        );
    """,
        """
        CREATE TABLE IF NOT EXISTS product_images (
            id VARCHAR(36) PRIMARY KEY,
            product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            thumbnail_url TEXT,
            is_main BOOLEAN DEFAULT false,
            display_order INTEGER DEFAULT 0,
            alt_text VARCHAR(200),
            created_at TIMESTAMPTZ NOT NULL
        );
    """,
        """
        CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
    """,
    ],
    "cart": [
        """
        CREATE TABLE IF NOT EXISTS carts (
            id VARCHAR(36) PRIMARY KEY,
            customer_name TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            currency_id VARCHAR(36),
            payment_method VARCHAR(100),
            payment_type VARCHAR(100),
            qr_code TEXT,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL,
            region_id VARCHAR(36),
            subtotal NUMERIC(10, 2) DEFAULT 0,
            tax_amount NUMERIC(10, 2) DEFAULT 0,
            total_with_tax NUMERIC(10, 2) DEFAULT 0
        );
    """,
        """
        CREATE TABLE IF NOT EXISTS cart_items (
            id SERIAL PRIMARY KEY,
            cart_id VARCHAR(36) NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
            product_id VARCHAR(36) NOT NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price NUMERIC(10, 2) NOT NULL
        );
    """,
    ],
    "sales": [
        """
        CREATE TABLE IF NOT EXISTS sales (
            id VARCHAR(36) PRIMARY KEY,
            cart_id VARCHAR(36) NOT NULL,
            customer_name TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            items JSONB,
            currency_id VARCHAR(36) NOT NULL,
            payment_details JSONB,
            status VARCHAR(50) NOT NULL DEFAULT 'completed',
            completed_by VARCHAR(100),
            completed_at TIMESTAMPTZ NOT NULL,
            region_id VARCHAR(36),
            subtotal NUMERIC(10, 2) NOT NULL,
            tax_amount NUMERIC(10, 2) NOT NULL,
            total_with_tax NUMERIC(10, 2) NOT NULL
        );
    """,
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
    """,
    ],
    "finance": [
        """
        CREATE TABLE IF NOT EXISTS currencies (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            symbol VARCHAR(10) NOT NULL,
            is_base BOOLEAN DEFAULT false,
            exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.0,
            base_currency_id VARCHAR(36),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        );
    """
    ],
    "business": [
        """
        CREATE TABLE IF NOT EXISTS business_info (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT DEFAULT 'E-Commerce',
            rif TEXT,
            contact TEXT,
            social_networks JSONB,
            logo_url TEXT,
            icon_url TEXT,
            updated_at TIMESTAMPTZ NOT NULL
        );
    """,
        """
        INSERT INTO business_info (id, updated_at) VALUES (1, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
    """,
    ],
    "customization": [
        """
        CREATE TABLE IF NOT EXISTS customization (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            primary_color TEXT DEFAULT '#264192',
            secondary_color TEXT DEFAULT '#ffdd00',
            accent_color TEXT DEFAULT '#ffffff',
            font_family TEXT DEFAULT 'Poppins',
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
        INSERT INTO customization (id, updated_at) VALUES (1, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
    """,
    ],
    "roles": [
        """
        CREATE TABLE IF NOT EXISTS roles (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            description TEXT,
            permissions JSONB NOT NULL DEFAULT '{}',
            is_system BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            is_deleted BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        );
    """
    ],
    "users": [
        """
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            email VARCHAR(255) UNIQUE,
            roles JSONB NOT NULL DEFAULT '[]',
            role_id VARCHAR(36) REFERENCES roles(id),
            is_active BOOLEAN DEFAULT true,
            is_deleted BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        );
    """
    ],
    "password_tokens": [
        """
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            is_used BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        );
    """
    ],
    "tax": [
        """
        CREATE TABLE IF NOT EXISTS regions (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            country VARCHAR(100),
            state VARCHAR(100),
            city VARCHAR(100),
            zip_code VARCHAR(20),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        );
    """,
        """
        CREATE TABLE IF NOT EXISTS tax_rates (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            region_id VARCHAR(36) NOT NULL REFERENCES regions(id),
            rate NUMERIC(8, 6) NOT NULL DEFAULT 0,
            priority INTEGER DEFAULT 1,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        );
    """,
    ],
}

# Define los "chunks" (archivos de base de datos separados)
# ESTO SÓLO SE USA EN MODO SQLITE
_DBS_SQLITE = {
    "products": "products.db",
    "cart": "cart.db",
    "sales": "sales.db",
    "finance": "finance.db",
    "business": "business.db",
    "customization": "customization.db",
    "customization": "customization.db",
    "roles": "roles.db",
    "users": "users.db",
    "tax": "tax.db",
    "password_tokens": "password_reset_tokens.db",
}

# Esquemas adaptados para SQLite (menos tipos de datos estrictos)
# Esto traduce automáticamente los esquemas de Postgres a SQLite
_SCHEMAS_SQLITE = {
    "products": [
        s.replace("NUMERIC(10, 2)", "REAL")
        .replace("NUMERIC(5, 2)", "REAL")
        .replace("VARCHAR(36)", "TEXT")
        .replace("VARCHAR(200)", "TEXT")
        .replace("VARCHAR(100)", "TEXT")
        .replace("VARCHAR(50)", "TEXT")
        .replace("TIMESTAMPTZ", "TEXT")
        .replace("REFERENCES products(id)", "REFERENCES products (id)")
        .replace("CREATE INDEX IF NOT EXISTS", "CREATE INDEX IF NOT EXISTS")
        for s in _SCHEMAS_POSTGRES["products"]
    ],
    "cart": [
        s.replace("NUMERIC(10, 2)", "REAL")
        .replace("VARCHAR(36)", "TEXT")
        .replace("VARCHAR(50)", "TEXT")
        .replace("VARCHAR(100)", "TEXT")
        .replace("TIMESTAMPTZ", "TEXT")
        .replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
        .replace("REFERENCES carts(id)", "REFERENCES carts (id)")  # Corrección de sintaxis
        for s in _SCHEMAS_POSTGRES["cart"]
    ],
    "sales": [
        s.replace("NUMERIC(10, 2)", "REAL")
        .replace("NUMERIC(12, 2)", "REAL")
        .replace("JSONB", "TEXT")
        .replace("VARCHAR(36)", "TEXT")
        .replace("VARCHAR(50)", "TEXT")
        .replace("VARCHAR(100)", "TEXT")
        .replace("TIMESTAMPTZ", "TEXT")
        .replace("DATE", "TEXT")
        .replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
        for s in _SCHEMAS_POSTGRES["sales"]
    ],
    "finance": [
        s.replace("NUMERIC(12, 6)", "REAL")
        .replace("VARCHAR(36)", "TEXT")
        .replace("VARCHAR(100)", "TEXT")
        .replace("VARCHAR(10)", "TEXT")
        .replace("TIMESTAMPTZ", "TEXT")
        for s in _SCHEMAS_POSTGRES["finance"]
    ],
    "business": [
        s.replace("JSONB", "TEXT")
        .replace("TIMESTAMPTZ", "TEXT")
        .replace("ON CONFLICT (id) DO NOTHING", "ON CONFLICT(id) DO NOTHING")  # Corrección de sintaxis
        for s in _SCHEMAS_POSTGRES["business"]
    ],
    "customization": [
        s.replace("TIMESTAMPTZ", "TEXT").replace(
            "ON CONFLICT (id) DO NOTHING", "ON CONFLICT(id) DO NOTHING"
        )  # Corrección de sintaxis
        for s in _SCHEMAS_POSTGRES["customization"]
    ],
    "roles": [
        s.replace("JSONB", "TEXT")
        .replace("VARCHAR(36)", "TEXT")
        .replace("VARCHAR(50)", "TEXT")
        .replace("TIMESTAMPTZ", "TEXT")
        for s in _SCHEMAS_POSTGRES["roles"]
    ],
    "users": [
        s.replace("JSONB", "TEXT")
        .replace("VARCHAR(36)", "TEXT")
        .replace("VARCHAR(100)", "TEXT")
        .replace("VARCHAR(255)", "TEXT")
        .replace("TIMESTAMPTZ", "TEXT")
        .replace("REFERENCES roles(id)", "REFERENCES roles (id)")
        for s in _SCHEMAS_POSTGRES["users"]
    ],
    "password_tokens": [
        s.replace("VARCHAR(36)", "TEXT").replace("TIMESTAMPTZ", "TEXT") for s in _SCHEMAS_POSTGRES["password_tokens"]
    ],
    "tax": [
        s.replace("NUMERIC(8, 6)", "REAL")
        .replace("VARCHAR(36)", "TEXT")
        .replace("VARCHAR(100)", "TEXT")
        .replace("VARCHAR(20)", "TEXT")
        .replace("TIMESTAMPTZ", "TEXT")
        .replace("REFERENCES regions(id)", "REFERENCES regions (id)")  # Corrección de sintaxis
        for s in _SCHEMAS_POSTGRES["tax"]
    ],
}


class DatabaseManager:
    """
    Gestor de conexiones de base de datos híbrido (SQLite o Postgres).
    """

    def __init__(self, base_path: str = "./data/database"):
        self.is_initialized = False

        if DB_TYPE == "postgres":
            # Construye la URL de conexión de Postgres desde las variables de entorno
            self.db_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASS')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
            self._pool: asyncpg.Pool | None = None
            logger.info(f"DatabaseManager inicializado en modo POSTGRES (host: {os.getenv('DB_HOST')})")
        else:
            # Lógica de SQLite (modo local)
            self.base_path = Path(base_path)
            self.base_path.mkdir(parents=True, exist_ok=True)
            self._connections: dict[str, aiosqlite.Connection] = {}
            logger.info(f"DatabaseManager inicializado en modo SQLITE (path: {base_path})")

    async def initialize(self):
        """Enciende las conexiones y crea los esquemas."""
        if self.is_initialized:
            return

        if DB_TYPE == "postgres":
            # --- Lógica de Inicialización de Postgres ---
            try:
                self._pool = await asyncpg.create_pool(self.db_url)
                logger.info("Pool de conexiones de PostgreSQL conectado.")
                # Crear todas las tablas en la única base de datos
                async with self._pool.acquire() as conn:
                    for chunk_name, schemas in _SCHEMAS_POSTGRES.items():
                        logger.info(f"Aplicando esquema de Postgres para: {chunk_name}")
                        for schema in schemas:
                            await conn.execute(schema)
                logger.info("Esquemas de PostgreSQL creados/verificados.")
            except Exception as e:
                logger.error(f"Error fatal inicializando PostgreSQL: {e}", exc_info=True)
                raise
        else:
            # --- Lógica de Inicialización de SQLite ---
            logger.info(f"Inicializando DatabaseManager (SQLite). {len(_DBS_SQLITE)} chunks definidos.")
            for chunk_name, db_file in _DBS_SQLITE.items():
                db_path = self.base_path / db_file
                try:
                    conn = await aiosqlite.connect(db_path)
                    conn.row_factory = aiosqlite.Row
                    self._connections[chunk_name] = conn
                    await conn.execute("PRAGMA foreign_keys = ON;")

                    if chunk_name in _SCHEMAS_SQLITE:
                        for schema in _SCHEMAS_SQLITE[chunk_name]:
                            await conn.execute(schema)
                        await conn.commit()
                    logger.info(f"Chunk (SQLite) '{chunk_name}' [conectado] en {db_path}")
                except Exception as e:
                    logger.error(f"Error inicializando chunk (SQLite) '{chunk_name}' en {db_path}: {e}", exc_info=True)
                    raise

        self.is_initialized = True
        logger.info("DatabaseManager inicializado exitosamente.")

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

            return [row_to_dict(row) for row in rows]
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
            raise ValueError(f"Error de base de datos: {e}")

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
