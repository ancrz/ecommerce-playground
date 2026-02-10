import asyncio
import logging
import sys
from pathlib import Path

# Agregar el directorio raíz del proyecto al path para que las importaciones absolutas funcionen
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(PROJECT_ROOT))

from create_dummy_data import (  # noqa: E402
    create_dummy_admin_user,
    create_dummy_currencies,
    create_dummy_products,
    create_dummy_tax_region,
    reset_database_files,
)

from backend.database.manager import DatabaseManager  # noqa: E402
from backend.services.finance_service import FinanceService  # noqa: E402
from backend.services.product_service import ProductService  # noqa: E402
from backend.services.tax_service import TaxService  # noqa: E402
from backend.services.user_service import UserService  # noqa: E402

# --- Configuración ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


async def main():
    """
    Script de prueba para validar el acceso a la base de datos y la funcionalidad de los servicios.
    """
    logger.info("==============================================================")
    logger.info("  INICIANDO PRUEBA DE SERVICIOS Y ACCESO A BASE DE DATOS")
    logger.info("==============================================================")

    # --- Reset DB para una prueba limpia ---
    logger.info("\n--- Reseteando la base de datos para una prueba limpia ---")
    reset_database_files()

    db_manager = DatabaseManager()
    await db_manager.initialize()

    try:
        # --- Inicializar Servicios ---
        product_service = ProductService(db_manager)
        user_service = UserService(db_manager)
        finance_service = FinanceService(db_manager)
        tax_service = TaxService(db_manager)

        # --- Poblar DB con datos de prueba ---
        logger.info("\n--- Poblando la base de datos con datos de prueba ---")
        await create_dummy_admin_user(user_service)
        await create_dummy_currencies(finance_service)
        await create_dummy_tax_region(tax_service)
        await create_dummy_products(product_service)
        logger.info("\n--- Fin del poblado de la base de datos ---")

        # --- Prueba de ProductService ---
        logger.info("\n--- Probando ProductService ---")
        products = await product_service.get_all_products()
        if products:
            logger.info(f"✓ Éxito: Se encontraron {len(products)} productos.")
            for p in products[:2]:  # Mostrar los primeros 2
                logger.info(f"  - Producto: {p.name}, Precio: {p.price}")
        else:
            logger.error("❌ Error: No se encontraron productos.")

        # --- Prueba de UserService ---
        logger.info("\n--- Probando UserService ---")
        users = await user_service.get_all_users()
        if users:
            logger.info(f"✓ Éxito: Se encontraron {len(users)} usuarios.")
            for u in users:
                logger.info(f"  - Usuario: {u.username}, Roles: {u.roles}")
        else:
            logger.error("❌ Error: No se encontraron usuarios.")

        # --- Prueba de FinanceService ---
        logger.info("\n--- Probando FinanceService ---")
        currencies = await finance_service.get_all_currencies()
        if currencies:
            logger.info(f"✓ Éxito: Se encontraron {len(currencies)} monedas.")
            for c in currencies:
                logger.info(f"  - Moneda: {c.name} ({c.symbol}), Tasa: {c.exchange_rate}")
        else:
            logger.error("❌ Error: No se encontraron monedas.")

        # --- Prueba de TaxService ---
        logger.info("\n--- Probando TaxService ---")
        regions = await tax_service.get_regions()
        if regions:
            logger.info(f"✓ Éxito: Se encontraron {len(regions)} regiones fiscales.")
            for r in regions:
                logger.info(f"  - Región: {r.name}")
                rates = await tax_service.get_tax_rates_for_region(r.id)
                if rates:
                    logger.info(f"    ✓ Se encontraron {len(rates)} tasas para esta región.")
                    for rate in rates:
                        logger.info(f"      - Tasa: {rate.name} ({rate.rate * 100}%)")
                else:
                    logger.warning(f"    - Advertencia: No se encontraron tasas para la región {r.name}.")
        else:
            logger.error("❌ Error: No se encontraron regiones fiscales.")

    except Exception as e:
        logger.error(f"❌ Ocurrió un error durante la prueba de servicios: {e}", exc_info=True)
    finally:
        await db_manager.close()
        logger.info("\n==============================================================")
        logger.info("  PRUEBA DE SERVICIOS FINALIZADA")
        logger.info("==============================================================")


if __name__ == "__main__":
    # This check is necessary because ProductService has a relative import
    # that fails if this script is not run as a module.
    if "backend" not in sys.modules:
        # If 'backend' is not loaded, it means we are running this script directly.
        # The sys.path modification at the top of the file handles this.
        pass
    asyncio.run(main())
