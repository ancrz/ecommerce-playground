"""
Ecommerce Playground - Servidor Principal (Orquestador)
REFACTORIZADO (v2.1 RBAC + Impuestos):
- Implementa la inicialización controlada (lifespan)[cite: 70].
- Instancia e inyecta TODOS los servicios (DI).
- Registra TODOS los routers (incluyendo los nuevos) con seguridad RBAC.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# --- 4. Importar Routers (APIs) ---
from .api import auth as auth_router
from .api import business as business_router
from .api import cart as cart_router
from .api import client_logs as client_logs_router
from .api import customization as customization_router
from .api import dashboard as dashboard_router
from .api import finance as finance_router
from .api import images as images_router
from .api import products as products_router
from .api import roles as roles_router
from .api import sales as sales_router
from .api import tax_admin as tax_admin_router
from .api import user_admin as user_admin_router
from .api import websocket as websocket_router

# --- 1. Importar Config ---
from .core.config import settings

# --- 3. Exception Handlers ---
# --- 2. Importar Database Manager ---
from .database.manager import DatabaseManager

# --- 1. Importar Config ---
# --- 5. Importar Servicios ---
from .services.business_service import BusinessService
from .services.cart_service import CartService
from .services.customization_service import CustomizationService
from .services.email_service import EmailService  # Nuevo
from .services.finance_service import FinanceService
from .services.image_service import ImageService
from .services.invoice_service import InvoiceService  # Nuevo
from .services.product_service import ProductService
from .services.sales_service import SalesService
from .services.tax_service import TaxService
from .services.user_service import UserService

# Configuración de Logging del Backend (Moved to avoid Import warnings)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
    force=True,
)

logger = logging.getLogger(__name__)

# Variables globales para servicios
db_manager: DatabaseManager | None = None


# --- 6. Inicialización Controlada (Lifespan) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestión del ciclo de vida de la aplicación"""
    global db_manager

    logger.info(f"🚀 Iniciando {settings.APP_NAME} v{settings.VERSION}...")

    # Paso 1: Inicializar la Base de Datos
    logger.info("Conectando a la Base de Datos (Chunks)...")
    db_path = settings.DATABASE_URL
    if db_path.startswith("sqlite:///"):
        db_path = "./data/database"  # Fallback for SQLite

    db_manager = DatabaseManager(base_path=db_path)
    await db_manager.initialize()
    logger.info(f"✓ Base de Datos lista en {db_path}.")

    # Paso 2: Inicializar Servicios (en orden de dependencia)
    logger.info("Inicializando servicios de negocio...")

    # Servicios Nivel 0 (Sin dependencias cruzadas)
    upload_path = settings.UPLOAD_PATH
    image_service = ImageService(upload_path=upload_path)
    app.state.image_service = image_service
    user_service = UserService(db_manager=db_manager)
    app.state.user_service = user_service
    business_service = BusinessService(db_manager=db_manager, image_service=image_service)
    app.state.business_service = business_service
    product_service = ProductService(db_manager=db_manager)
    app.state.product_service = product_service
    finance_service = FinanceService(db_manager=db_manager)
    app.state.finance_service = finance_service
    tax_service = TaxService(db_manager=db_manager)
    app.state.tax_service = tax_service
    customization_service = CustomizationService(db_manager=db_manager, image_service=image_service)
    app.state.customization_service = customization_service
    email_service = EmailService()  # Nuevo
    app.state.email_service = email_service

    # Servicios Nivel 1 (Integradores)
    invoice_service = InvoiceService(
        business_service=business_service, email_service=email_service
    )  # Nuevo (Depende de Business y Email)
    app.state.invoice_service = invoice_service

    app.state.cart_service = CartService(
        db_manager=db_manager,
        product_service=product_service,
        tax_service=tax_service,
    )
    app.state.sales_service = SalesService(
        db_manager=db_manager,
        cart_service=app.state.cart_service,
        product_service=product_service,
        tax_service=tax_service,
        invoice_service=invoice_service,  # Inyección de dependencia
    )
    app.state.client_logs_service = None  # Placeholder if needed

    logger.info("✓ Servicios inicializados.")

    # Paso 3: Asegurar carpetas de 'uploads'
    try:
        image_service.products_path.mkdir(parents=True, exist_ok=True)
        image_service.logos_path.mkdir(parents=True, exist_ok=True)
        image_service.icons_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"✓ Carpetas de 'uploads' aseguradas en {upload_path}")
    except Exception as e:
        logger.error(f"Error fatal: No se pudieron crear carpetas de 'uploads': {e}")
        raise

    logger.info("✅ Sistema iniciado correctamente.")
    logger.info(f"🌐 Backend corriendo en port {settings.PORT}")

    yield

    # Cleanup
    logger.info("🛑 Cerrando aplicación...")
    if db_manager:
        await db_manager.close()


# --- 6. Crear aplicación FastAPI ---
app = FastAPI(
    title=settings.APP_NAME,
    description="API para sistema de e-commerce de farmacia (Arquitectura de Servicios Refactorizada v2.1)",
    version=settings.VERSION,
    lifespan=lifespan,
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar carpeta de uploads como archivos estáticos
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_PATH), name="uploads")

# --- 7. Registrar Routers ---
app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"])
app.include_router(products_router.router, prefix="/api/products", tags=["Products"])
app.include_router(cart_router.router, prefix="/api/cart", tags=["Cart"])
app.include_router(sales_router.router, prefix="/api/sales", tags=["Sales"])
app.include_router(finance_router.router, prefix="/api/finance", tags=["Finance"])
app.include_router(tax_admin_router.router, prefix="/api/admin/tax", tags=["Tax Admin"])

# ...

app.include_router(user_admin_router.router, prefix="/api/admin/users", tags=["User Admin"])
app.include_router(roles_router.router, prefix="/api/admin/roles", tags=["Role Admin"])
app.include_router(business_router.router, prefix="/api/business", tags=["Business"])
app.include_router(customization_router.router, prefix="/api/admin/customization", tags=["Customization"])
app.include_router(images_router.router, prefix="/api/images", tags=["Images"])
app.include_router(client_logs_router.router, prefix="/api/client-logs", tags=["Client Logs"])
app.include_router(websocket_router.router, prefix="/api/ws", tags=["WebSocket"])
app.include_router(dashboard_router.router, prefix="/api/admin/dashboard", tags=["Admin Dashboard"])


# Endpoints de "Ping"
@app.get("/")
async def root():
    return {"message": f"{settings.APP_NAME} v{settings.VERSION}", "status": "running"}


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected" if db_manager and db_manager.is_initialized else "disconnected",
    }
