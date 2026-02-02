"""
Farmalux E-commerce - Servidor Principal (Orquestador)
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

# --- 3. Importar Routers (APIs) ---
from .core.config import settings

# --- 1. Importar Módulos Base ---
from .database.manager import DatabaseManager

# --- 2. Importar Servicios ---
from .services.business_service import BusinessService
from .services.cart_service import CartService
from .services.customization_service import CustomizationService
from .services.finance_service import FinanceService
from .services.image_service import ImageService
from .services.product_service import ProductService
from .services.sales_service import SalesService
from .services.tax_service import TaxService
from .services.user_service import UserService

# --- 4. Importar Guardianes RBAC ---

# ... (Imports skipped)

# Cargar variables de entorno
# load_dotenv() <-- Eliminado en favor de pydantic-settings

# Configurar logging (centralizado)
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ... (Skip specific loggers)

# ... (Skip RoleChecker)


# --- 6. Inicialización Controlada (Lifespan) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestión del ciclo de vida de la aplicación"""
    # Hacer globales las variables para que los inyectores las vean
    global db_manager, product_service, finance_service, tax_service
    global cart_service, sales_service, image_service, business_service, user_service
    global customization_service

    logger.info(f"🚀 Iniciando {settings.APP_NAME} v{settings.VERSION}...")

    # Paso 1: Inicializar la Base de Datos (La base)
    logger.info("Conectando a la Base de Datos (Chunks)...")
    # REFACTOR: settings.DATABASE_URL or path
    # db_path = os.getenv("DB_PATH", "./data/database")
    # Adapta el path si settings.DATABASE_URL es connection string
    # Assuming DatabaseManager expects path for SQLite
    # Extraer path de settings.DATABASE_URL si es sqlite://
    db_path = settings.DATABASE_URL
    if db_path.startswith("sqlite:///"):
        db_path = db_path.replace("sqlite:///", "")  # Keep it simple for now or restructure DatabaseManager
        # Remove filename to get dir?
        # DatabaseManager expects base_path to directory or file?
        # Checking existing: db_path = os.getenv("DB_PATH", "./data/database")
        # Existing value was directory.
        db_path = "./data/database"  # Fallback/Hardcoded for compatibility if settings uses full URL

    db_manager = DatabaseManager(base_path=db_path)
    await db_manager.initialize()
    logger.info(f"✓ Base de Datos lista en {db_path}.")

    # Paso 2: Inicializar Servicios (en orden de dependencia)
    logger.info("Inicializando servicios de negocio...")

    # Servicios Nivel 0 (Sin dependencias cruzadas)
    upload_path = settings.UPLOAD_PATH
    # ... (Service init remains) ...
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

    # Servicios Nivel 1 (Integradores)
    cart_service = CartService(
        db_manager=db_manager,
        product_service=product_service,
        tax_service=tax_service,
    )
    app.state.cart_service = cart_service
    sales_service = SalesService(
        db_manager=db_manager,
        cart_service=cart_service,
        product_service=product_service,
    )
    # ...

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

    # ... (Cleanup remains)


# --- 8. Crear aplicación FastAPI ---
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

# ... (CacheControlMiddleware remains)

# Montar carpeta de uploads como archivos estáticos
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_PATH), name="uploads")

# ... (Routers remain)


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
