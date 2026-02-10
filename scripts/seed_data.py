#!/usr/bin/env python3
"""
Seed Data Script - ecommerce-playground
=====================================
Inicializa la base de datos con datos semilla para desarrollo.
IMPLEMENTA IDEMPOTENCIA: Puede ejecutarse múltiples veces sin errores.

Uso:
    python scripts/seed_data.py [--clean]
"""

import argparse
import asyncio
import logging
import os
import sys
from datetime import datetime
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
    """Create the admin user idempotently."""
    from backend.models.users import UserCreateRequest

    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin2024")

    logger.info("Verificando usuario administrador...")
    existing = await user_service.get_user_by_username(admin_username)
    if existing:
        logger.info(f"  ℹ️ Usuario '{admin_username}' ya existe.")
        return existing

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
        logger.info(f"  ✓ Usuario '{user.username}' creado exitosamente.")
        return user
    except Exception as e:
        logger.error(f"  ❌ Error creando admin: {e}")
        return None


async def seed_test_users(user_service):
    """Create test users idempotently."""
    from backend.models.users import UserCreateRequest

    test_password = os.getenv("DUMMY_USER_PASSWORD", "password123")
    users_to_create = [
        {"username": "products_manager", "full_name": "Gerente de Productos", "email": "products@e-commerce.local", "roles": ["products_manager"]},
        {"username": "sales_manager", "full_name": "Gerente de Ventas", "email": "sales@e-commerce.local", "roles": ["sales_manager"]},
        {"username": "finance_manager", "full_name": "Gerente de Finanzas", "email": "finance@e-commerce.local", "roles": ["finance_manager"]},
        {"username": "content_manager", "full_name": "Gerente de Contenido", "email": "content@e-commerce.local", "roles": ["content_manager"]},
    ]

    logger.info("Sincronizando usuarios de prueba...")
    for user_data in users_to_create:
        if await user_service.get_user_by_username(user_data["username"]):
            logger.info(f"  ℹ️ Usuario '{user_data['username']}' ya existe.")
            continue
        try:
            user_dto = UserCreateRequest(
                username=user_data["username"],
                plain_password=test_password,
                full_name=user_data["full_name"],
                email=user_data["email"],
                roles=user_data["roles"],
                is_active=True,
            )
            await user_service.create_user(user_dto)
            logger.info(f"  ✓ Usuario '{user_data['username']}' creado.")
        except Exception as e:
            logger.warning(f"  ⚠️ Error creando '{user_data['username']}': {e}")


async def seed_currencies(finance_service):
    """Create default currencies idempotently."""
    logger.info("Sincronizando monedas...")
    existing_currencies = await finance_service.get_all_currencies(active_only=False)
    existing_names = [c.name for c in existing_currencies]

    # Base currency
    if "Bolívares" not in existing_names:
        try:
            bs = await finance_service.create_currency(name="Bolívares", symbol="Bs.", is_base=True)
            logger.info(f"  ✓ Moneda base creada: {bs.name}")
        except Exception as e:
            logger.warning(f"  ⚠️ Fallo al crear Bolívares: {e}")
    else:
        logger.info("  ℹ️ Moneda 'Bolívares' ya existe.")

    # Secondary currency
    if "Dólares" not in existing_names:
        try:
            default_rate = Decimal(os.getenv("DEFAULT_EXCHANGE_RATE", "36.50"))
            usd = await finance_service.create_currency(name="Dólares", symbol="$", is_base=False, exchange_rate=default_rate)
            logger.info(f"  ✓ Moneda secundaria creada: {usd.name}")
        except Exception as e:
            logger.warning(f"  ⚠️ Fallo al crear Dólares: {e}")
    else:
        logger.info("  ℹ️ Moneda 'Dólares' ya existe.")


async def seed_tax_config(tax_service, db_manager):
    """Create default tax region and rates idempotently."""
    logger.info("Sincronizando configuración fiscal...")
    
    # Check if region exists (tax_service might not have a simple list by name method)
    region_name = "Tienda Principal"
    row = await db_manager.fetchone("tax", "SELECT id FROM regions WHERE name = ?", (region_name,))
    
    if not row:
        try:
            region = await tax_service.create_region(name=region_name, country="Venezuela", state="Anzoátegui", city="Anaco")
            logger.info(f"  ✓ Región fiscal creada: {region.name}")
            
            # Create IVA tax rate only if region was just created
            await tax_service.create_tax_rate(name="IVA 16%", region_id=region.id, rate=Decimal("0.16"))
            logger.info("  ✓ Tasa de impuesto IVA 16% creada.")
        except Exception as e:
            logger.warning(f"  ⚠️ Error creando configuración fiscal: {e}")
    else:
        logger.info(f"  ℹ️ Región '{region_name}' ya existe.")


async def seed_business_config(db_manager):
    """Ensure singleton configs exist idempotently."""
    logger.info("Sincronizando configuración de negocio...")
    now_iso = datetime.now().isoformat()

    # 1. Business Info
    try:
        row = await db_manager.fetchone("business", "SELECT id FROM business_info WHERE id = 1")
        if not row:
            await db_manager.execute(
                "business",
                "INSERT INTO business_info (id, name, social_networks, updated_at) VALUES (?, ?, ?, ?)",
                (1, "E-Commerce", "[]", now_iso),
            )
            logger.info("  ✓ BusinessInfo inicializado.")
        else:
            logger.info("  ℹ️ BusinessInfo ya existe.")
    except Exception as e:
        logger.warning(f"  ⚠️ Error seed BusinessInfo: {e}")

    # 2. Customization
    try:
        row = await db_manager.fetchone("customization", "SELECT id FROM customization WHERE id = 1")
        if not row:
            await db_manager.execute(
                "customization",
                """
                INSERT INTO customization (id, primary_color, secondary_color, accent_color, font_family, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (1, "#264192", "#ffdd00", "#ffffff", "Poppins", now_iso),
            )
            logger.info("  ✓ Customization inicializado.")
        else:
            logger.info("  ℹ️ Customization ya existe.")
    except Exception as e:
        logger.warning(f"  ⚠️ Error seed Customization: {e}")


async def seed_products(product_service, db_manager):
    """Create sample products idempotently."""
    from backend.models.products import Product
    logger.info("Sincronizando productos de muestra...")

    products_data = [
        {"name": "Paracetamol 500mg", "description": "Caja con 20 tabletas", "sku": "PARA-500-20", "price": Decimal("45.00"), "stock": 150, "category": "Analgésicos"},
        {"name": "Ibuprofeno 400mg", "description": "Caja con 24 cápsulas", "sku": "IBU-400-24", "price": Decimal("65.00"), "stock": 120, "category": "Analgésicos"},
        {"name": "Amoxicilina 500mg", "description": "Caja con 21 cápsulas", "sku": "AMOX-500-21", "price": Decimal("125.00"), "stock": 80, "category": "Antibióticos"},
        {"name": "Vitamina C 1000mg", "description": "Frasco con 30 tabletas", "sku": "VITC-1000-30", "price": Decimal("85.00"), "stock": 200, "category": "Vitaminas", "is_featured": True},
        {"name": "Omeprazol 20mg", "description": "Caja con 14 cápsulas", "sku": "OME-20-14", "price": Decimal("55.00"), "stock": 100, "category": "Digestivos"},
    ]

    for data in products_data:
        # Check SKU existence
        row = await db_manager.fetchone("products", "SELECT id FROM products WHERE sku = ?", (data["sku"],))
        if row:
            logger.info(f"  ℹ️ Producto SKU '{data['sku']}' ya existe.")
            continue
        try:
            product = Product(**data)
            await product_service.create_product(product)
            logger.info(f"  ✓ Producto creado: {product.name}")
        except Exception as e:
            logger.warning(f"  ⚠️ Error creando '{data['name']}': {e}")


async def main():
    """Main seed function."""
    parser = argparse.ArgumentParser(description="Seed database idempotently")
    parser.add_argument("--clean", action="store_true", help="Clean database before seeding")
    args = parser.parse_args()

    print("\n" + "=" * 60 + "\n  Seed Data Idempotente - ecommerce-playground\n" + "=" * 60 + "\n")

    load_env()
    os.environ["DB_TYPE"] = "sqlite"

    if args.clean:
        clean_database()

    from backend.database.manager import DatabaseManager
    from backend.services.finance_service import FinanceService
    from backend.services.product_service import ProductService
    from backend.services.tax_service import TaxService
    from backend.services.user_service import UserService

    logger.info("Inicializando gestor de datos...")
    db_manager = DatabaseManager()
    await db_manager.initialize()

    try:
        user_service = UserService(db_manager)
        finance_service = FinanceService(db_manager)
        tax_service = TaxService(db_manager)
        product_service = ProductService(db_manager)

        await seed_admin_user(user_service)
        await seed_test_users(user_service)
        await seed_currencies(finance_service)
        await seed_tax_config(tax_service, db_manager)
        await seed_business_config(db_manager)
        await seed_products(product_service, db_manager)

        print("\n" + "=" * 60 + "\n✅ Proceso de Seed finalizado con éxito.\n" + "=" * 60 + "\n")
    finally:
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(main())