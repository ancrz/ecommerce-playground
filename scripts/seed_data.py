#!/usr/bin/env python3
"""
Seed Data Script - ecommerce-playground
=====================================
Inicializa la base de datos con datos semilla para desarrollo.

Este script:
1. Crea el usuario administrador por defecto
2. Crea usuarios de prueba con diferentes roles
3. Crea monedas de prueba (Bs, USD)
4. Crea configuración fiscal (región + IVA)
5. Crea productos de muestra

Uso:
    python scripts/seed_data.py [--clean]

    --clean: Elimina los archivos .db existentes antes de crear nuevos
"""

import argparse
import asyncio
import logging
import os
import sys
from decimal import Decimal
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(PROJECT_ROOT))

# --- Configuración ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def load_env():
    """Load environment variables from .env file."""
    env_file = PROJECT_ROOT / ".env"

    if env_file.exists():
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key:
                        os.environ[key] = value


def clean_database():
    """Remove existing database files."""
    db_path = Path(os.getenv("DB_PATH", "./data/database"))

    if not db_path.exists():
        return

    db_files = list(db_path.glob("*.db"))
    if db_files:
        logger.info(f"Eliminando {len(db_files)} archivos de base de datos...")
        for f in db_files:
            try:
                f.unlink()
                logger.info(f"  ✓ Eliminado: {f.name}")
            except Exception as e:
                logger.error(f"  ❌ Error eliminando {f.name}: {e}")


async def seed_admin_user(user_service):
    """Create the admin user."""
    from backend.models.users import UserCreateRequest

    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin2024")

    logger.info("Creando usuario administrador...")

    try:
        admin_dto = UserCreateRequest(
            username=admin_username,
            plain_password=admin_password,
            full_name="Administrador del Sistema",
            email="admin@e-commerce.local",
            roles=["admin"],
            is_active=True,
        )
        user = await user_service.create_user(admin_dto)
        logger.info(f"  ✓ Usuario '{user.username}' creado con roles: {user.roles}")
        return user
    except ValueError as e:
        if "ya existe" in str(e).lower() or "already exists" in str(e).lower():
            logger.info(f"  ℹ️ Usuario '{admin_username}' ya existe")
        else:
            logger.error(f"  ❌ Error: {e}")
        return None


async def seed_test_users(user_service):
    """Create test users with different roles."""
    from backend.models.users import UserCreateRequest

    test_password = os.getenv("DUMMY_USER_PASSWORD", "password123")

    users_to_create = [
        {
            "username": "products_manager",
            "full_name": "Gerente de Productos",
            "email": "products@e-commerce.local",
            "roles": ["products_manager"],
        },
        {
            "username": "sales_manager",
            "full_name": "Gerente de Ventas",
            "email": "sales@e-commerce.local",
            "roles": ["sales_manager"],
        },
        {
            "username": "finance_manager",
            "full_name": "Gerente de Finanzas",
            "email": "finance@e-commerce.local",
            "roles": ["finance_manager"],
        },
        {
            "username": "content_manager",
            "full_name": "Gerente de Contenido",
            "email": "content@e-commerce.local",
            "roles": ["content_manager"],
        },
    ]

    logger.info("Creando usuarios de prueba...")

    for user_data in users_to_create:
        try:
            user_dto = UserCreateRequest(
                username=user_data["username"],
                plain_password=test_password,
                full_name=user_data["full_name"],
                email=user_data["email"],
                roles=user_data["roles"],
                is_active=True,
            )
            user = await user_service.create_user(user_dto)
            logger.info(f"  ✓ Usuario '{user.username}' creado")
        except ValueError as e:
            if "ya existe" in str(e).lower() or "already exists" in str(e).lower():
                logger.info(f"  ℹ️ Usuario '{user_data['username']}' ya existe")
            else:
                logger.warning(f"  ⚠️ Error creando '{user_data['username']}': {e}")


async def seed_currencies(finance_service):
    """Create default currencies."""
    logger.info("Creando monedas...")

    try:
        # Base currency (Bolivares)
        bs = await finance_service.create_currency(name="Bolívares", symbol="Bs.", is_base=True)
        logger.info(f"  ✓ Moneda base creada: {bs.name} ({bs.symbol})")

        # Secondary currency (USD)
        default_rate = Decimal(os.getenv("DEFAULT_EXCHANGE_RATE", "36.50"))
        usd = await finance_service.create_currency(
            name="Dólares", symbol="$", is_base=False, exchange_rate=default_rate
        )
        logger.info(f"  ✓ Moneda secundaria creada: {usd.name} ({usd.symbol}) - Tasa: {usd.exchange_rate}")

        return bs, usd
    except ValueError as e:
        logger.warning(f"  ⚠️ Error creando monedas (¿ya existen?): {e}")
        return None, None


async def seed_tax_config(tax_service):
    """Create default tax region and rates."""
    logger.info("Creando configuración fiscal...")

    try:
        # Create default region
        region = await tax_service.create_region(
            name="Tienda Principal", country="Venezuela", state="Anzoátegui", city="Anaco"
        )
        logger.info(f"  ✓ Región fiscal creada: {region.name}")

        # Create IVA tax rate
        tax_rate = await tax_service.create_tax_rate(name="IVA 16%", region_id=region.id, rate=Decimal("0.16"))
        logger.info(f"  ✓ Tasa de impuesto creada: {tax_rate.name} ({float(tax_rate.rate) * 100}%)")

        return region
    except ValueError as e:
        logger.warning(f"  ⚠️ Error creando configuración fiscal: {e}")
        return None


async def seed_products(product_service):
    """Create sample products."""
    from backend.models.products import Product

    logger.info("Creando productos de muestra...")

    products_data = [
        {
            "name": "Paracetamol 500mg",
            "description": "Caja con 20 tabletas para alivio del dolor y fiebre.",
            "sku": "PARA-500-20",
            "price": Decimal("45.00"),
            "stock": 150,
            "category": "Analgésicos",
        },
        {
            "name": "Ibuprofeno 400mg",
            "description": "Caja con 24 cápsulas antiinflamatorias.",
            "sku": "IBU-400-24",
            "price": Decimal("65.00"),
            "stock": 120,
            "category": "Analgésicos",
        },
        {
            "name": "Amoxicilina 500mg",
            "description": "Caja con 21 cápsulas antibióticas.",
            "sku": "AMOX-500-21",
            "price": Decimal("125.00"),
            "stock": 80,
            "category": "Antibióticos",
        },
        {
            "name": "Vitamina C 1000mg",
            "description": "Frasco con 30 tabletas efervescentes.",
            "sku": "VITC-1000-30",
            "price": Decimal("85.00"),
            "stock": 200,
            "category": "Vitaminas",
            "is_featured": True,
        },
        {
            "name": "Omeprazol 20mg",
            "description": "Caja con 14 cápsulas para problemas digestivos.",
            "sku": "OME-20-14",
            "price": Decimal("55.00"),
            "stock": 100,
            "category": "Digestivos",
        },
    ]

    created = 0
    for data in products_data:
        try:
            product = Product(**data)
            await product_service.create_product(product)
            logger.info(f"  ✓ Producto creado: {product.name}")
            created += 1
        except ValueError as e:
            if "ya existe" in str(e).lower() or "unique" in str(e).lower():
                logger.info(f"  ℹ️ Producto '{data['name']}' ya existe")
            else:
                logger.warning(f"  ⚠️ Error creando '{data['name']}': {e}")

    logger.info(f"  Total: {created} productos creados")


async def main():
    """Main seed function."""
    parser = argparse.ArgumentParser(description="Seed database with initial data")
    parser.add_argument("--clean", action="store_true", help="Clean database before seeding")
    args = parser.parse_args()

    print("")
    print("=" * 60)
    print("  Seed Data - ecommerce-playground")
    print("=" * 60)
    print("")

    # Load environment
    load_env()

    # Set DB_TYPE to sqlite
    os.environ["DB_TYPE"] = "sqlite"

    # Clean if requested
    if args.clean:
        clean_database()

    # Import after environment is set
    from backend.database.manager import DatabaseManager
    from backend.services.finance_service import FinanceService
    from backend.services.product_service import ProductService
    from backend.services.tax_service import TaxService
    from backend.services.user_service import UserService

    # Initialize database
    logger.info("Inicializando base de datos...")
    db_manager = DatabaseManager()
    await db_manager.initialize()
    logger.info("  ✓ Base de datos lista")

    try:
        # Create services
        user_service = UserService(db_manager)
        finance_service = FinanceService(db_manager)
        tax_service = TaxService(db_manager)
        product_service = ProductService(db_manager)

        # Seed data
        print("")
        await seed_admin_user(user_service)
        print("")
        await seed_test_users(user_service)
        print("")
        await seed_currencies(finance_service)
        print("")
        await seed_tax_config(tax_service)
        print("")
        await seed_products(product_service)

        print("")
        print("=" * 60)
        logger.info("✅ Seed completado exitosamente")
        print("=" * 60)
        print("")

        admin_user = os.getenv("ADMIN_USERNAME", "admin")
        admin_pass = os.getenv("ADMIN_PASSWORD", "admin2024")
        logger.info(f"Credenciales Admin: {admin_user} / {admin_pass}")
        print("")

    finally:
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(main())
