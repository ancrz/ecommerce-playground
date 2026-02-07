import asyncio
import logging
import os
import sys

# Añadir ruta raíz para imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database.manager import DB_TYPE, DatabaseManager

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def migrate():
    logger.info(f"Iniciando migración RBAC (Modo: {DB_TYPE.upper()})...")

    db_manager = DatabaseManager()
    await db_manager.initialize()

    try:
        # 1. Crear tabla 'roles'
        logger.info("Verificando tabla 'roles'...")
        # Intentamos consultar si existe. Si falla, la creamos.
        try:
            await db_manager.fetchone("roles", "SELECT 1 FROM roles LIMIT 1")
            logger.info("Tabla 'roles' ya existe.")
        except Exception:
            logger.info("Tabla 'roles' no encontrada (o vacía). Intentando crearla...")
            # En SQLite manager crea tablas si no existen al inicio,
            # pero necesitamos asegurarnos de que la estructura sea correcta.
            # Manager.initialize() ya debería haber ejecutado el CREATE TABLE IF NOT EXISTS.
            pass

        # 2. Alterar tabla 'users'
        logger.info("Verificando columnas en 'users'...")

        # Detectar columnas existentes
        # SQLite: PRAGMA table_info(users)
        # Postgres: information_schema.columns

        has_role_id = False
        has_is_deleted = False

        if DB_TYPE == "postgres":
            # TODO: Implementar check postgres si es necesario
            pass
        else:
            rows = await db_manager.fetchall("users", "PRAGMA table_info(users)")
            # row is dict: {'cid': 0, 'name': 'id', 'type': 'TEXT', ...}
            columns = [r["name"] for r in rows]

            if "role_id" in columns:
                has_role_id = True
            if "is_deleted" in columns:
                has_is_deleted = True

            if not has_role_id:
                logger.info("Añadiendo columna 'role_id' a 'users'...")
                await db_manager.execute("users", "ALTER TABLE users ADD COLUMN role_id TEXT REFERENCES roles(id)")

            if not has_is_deleted:
                logger.info("Añadiendo columna 'is_deleted' a 'users'...")
                await db_manager.execute("users", "ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT 0")

        # 3. Seed Roles
        logger.info("Sembrando roles por defecto...")

        # Admin (7 = rwx)
        admin_perms = '{"all": 7}'
        await db_manager.execute(
            "roles",
            """
            INSERT INTO roles (id, name, description, permissions, is_system, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(name) DO NOTHING
        """,
            ("role_admin", "Admin", "Administrador del Sistema", admin_perms, True, True),
        )

        # Seller (Sales: 7, Products: 4)
        seller_perms = '{"sales": 7, "products": 4}'
        await db_manager.execute(
            "roles",
            """
            INSERT INTO roles (id, name, description, permissions, is_system, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(name) DO NOTHING
        """,
            ("role_seller", "Vendedor", "Gestión de Ventas", seller_perms, True, True),
        )

        logger.info("Migración completada exitosamente.")

    except Exception as e:
        logger.error(f"Error durante la migración: {e}", exc_info=True)
    finally:
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(migrate())
