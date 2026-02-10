"""
Alembic Environment Configuration
Handles database migrations for ecommerce-playground.

NOTE: Este proyecto actualmente usa un DatabaseManager custom que
maneja múltiples archivos SQLite (chunks). Alembic aquí se configura
para una migración unificada, pero la lógica de chunks se mantiene
en backend/database/manager.py para compatibilidad.

Para migraciones futuras, considerar migrar a un solo archivo SQLite
o usar SQLAlchemy ORM completo.
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import MetaData, engine_from_config, pool

from alembic import context

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import SQLModel
# Import all models to register them with SQLModel.metadata
from backend.models.users import User
from backend.models.products import Product, ProductImage
from backend.models.sales import Sale, Cart
from backend.models.finance import Currency, Region, TaxRate
from backend.models.customers import Customer
from backend.models.roles import Role
from backend.models.config import BusinessInfo, Customization

# this is the Alembic Config object
config = context.config

# MIGRATION STRATEGY: Detect DB_TYPE and configure accordingly
db_type = os.getenv("DB_TYPE", "sqlite")
if db_type == "postgres":
    user = os.getenv("DB_USER", "admin")
    password = os.getenv("DB_PASS", "admin2024")
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "ecommerce_unified")
    db_url = f"postgresql://{user}:{password}@{host}:{port}/{name}"
else:
    db_path = os.getenv("DB_PATH", "./data/database")
    db_url = f"sqlite:///{db_path}/ecommerce.db"

config.set_main_option("sqlalchemy.url", db_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add your model's MetaData object here for 'autogenerate' support
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # Required for SQLite ALTER TABLE support
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
