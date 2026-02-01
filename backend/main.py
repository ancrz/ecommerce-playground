"""
Farmalux E-commerce - Servidor Principal (Orquestador)
REFACTORIZADO (v2.1 RBAC + Impuestos):
- Implementa la inicialización controlada (lifespan)[cite: 70].
- Instancia e inyecta TODOS los servicios (DI).
- Registra TODOS los routers (incluyendo los nuevos) con seguridad RBAC.
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response

# --- 3. Importar Routers (APIs) ---
from .api import (
    auth,
    business,
    cart,
    client_logs,
    customization,
    finance,
    images,
    products,
    sales,
    tax_admin,
    user_admin,
    websocket,
)

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
from .utils.auth import (
    RoleChecker,
    is_content_manager,
    is_sales_manager,
)
from .utils.logging import setup_logs

# Cargar variables de entorno
load_dotenv()

# Configurar logging (centralizado)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Configurar logger específico para backend.utils.auth
auth_logger = logging.getLogger("backend.utils.auth")
auth_logger.setLevel(logging.DEBUG)

# Configurar logs por módulo
try:
    setup_logs()
except ImportError:
    logger.warning("No se pudo cargar backend.utils.logging")
except Exception as e:
    logger.error(f"Error configurando logs granulares: {e}")


# Definir una dependencia local para el rol de administrador
def get_admin_role_checker():
    return RoleChecker(["admin"])


# --- 5. Contenedor de Inyección de Dependencias (DI) ---
# Estas variables globales contendrán las instancias de nuestros servicios.
# Serán inicializadas en el 'lifespan'.

db_manager: DatabaseManager | None = None
product_service: ProductService | None = None
finance_service: FinanceService | None = None
tax_service: TaxService | None = None
cart_service: CartService | None = None
sales_service: SalesService | None = None
image_service: ImageService | None = None
business_service: BusinessService | None = None
user_service: UserService | None = None
customization_service: CustomizationService | None = None


# --- 6. Inicialización Controlada (Lifespan) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestión del ciclo de vida de la aplicación"""
    # Hacer globales las variables para que los inyectores las vean
    global db_manager, product_service, finance_service, tax_service
    global cart_service, sales_service, image_service, business_service, user_service
    global customization_service

    logger.info("🚀 Iniciando ecommerce-playground (v2.1 RBAC)...")

    # Paso 1: Inicializar la Base de Datos (La base)
    logger.info("Conectando a la Base de Datos (Chunks)...")
    db_path = os.getenv("DB_PATH", "./data/database")
    db_manager = DatabaseManager(base_path=db_path)
    await db_manager.initialize()
    logger.info(f"✓ Base de Datos lista en {db_path}.")

    # Paso 2: Inicializar Servicios (en orden de dependencia)
    logger.info("Inicializando servicios de negocio...")

    # Servicios Nivel 0 (Sin dependencias cruzadas)
    upload_path = os.getenv("UPLOAD_PATH", "./data/uploads")
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
    logger.info("✓ Todos los servicios están inicializados.")

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
    logger.info(f"🌐 Backend corriendo en http://{os.getenv('BACKEND_HOST')}:{os.getenv('BACKEND_PORT')}")

    yield

    # --- 7. Limpieza al cerrar ---
    logger.info("🔒 Cerrando sistema...")
    if db_manager:
        await db_manager.close()
    logger.info("✓ Conexiones a Base de Datos cerradas.")


# --- 8. Crear aplicación FastAPI ---
app = FastAPI(
    title="ecommerce-playground API",
    description="API para sistema de e-commerce de farmacia (Arquitectura de Servicios Refactorizada v2.1)",
    version="2.1.0-RBAC",
    lifespan=lifespan,
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Middleware para headers de caché
class CacheControlMiddleware(BaseHTTPMiddleware):
    """Añade headers de caché para archivos estáticos servidos desde /uploads/"""

    async def dispatch(self, request: StarletteRequest, call_next):
        response: Response = await call_next(request)

        # Solo para rutas de uploads y respuestas exitosas
        if request.url.path.startswith("/uploads/") and response.status_code == 200:
            # Cache por 1 año (inmutable, versionado por ?t=timestamp)
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"

        return response


app.add_middleware(CacheControlMiddleware)

# Montar carpeta de uploads como archivos estáticos
app.mount("/uploads", StaticFiles(directory=os.getenv("UPLOAD_PATH", "./data/uploads")), name="uploads")

# --- 9. Registrar Routers (APIs) con Seguridad RBAC ---
logger.info("Registrando routers de API...")

# --- APIs Públicas ---
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación y Autogestión"])
app.include_router(products.router, prefix="/api/products", tags=["Productos (Tienda)"])
app.include_router(finance.router, prefix="/api/finance", tags=["Finanzas (Tienda)"])
app.include_router(business.router, prefix="/api/business", tags=["Negocio (Tienda)"])
app.include_router(cart.router, prefix="/api/cart", tags=["Carrito (Tienda)"])
app.include_router(client_logs.router, prefix="/api/client-logs", tags=["Observabilidad"])

# --- APIs de Administración ---
# Módulo de Gestión de Negocio
app.include_router(
    business.router,
    prefix="/api/admin/business",
    tags=["Admin: Gestión de Negocio"],
    dependencies=[Depends(is_content_manager)],
)

# Módulo de Gestión de Usuarios
app.include_router(
    user_admin.router,
    prefix="/api/admin/users",
    tags=["Admin: Gestión de Usuarios"],
    dependencies=[Depends(get_admin_role_checker)],
)

# Módulo de Gestión de Ventas
app.include_router(
    sales.router,
    prefix="/api/admin/sales",
    tags=["Admin: Ventas y Cierre"],
    dependencies=[Depends(is_sales_manager)],
)

# Módulo de Gestión de Impuestos
app.include_router(
    tax_admin.router,
    prefix="/api/admin/tax",
    tags=["Admin: Impuestos y Regiones"],
)

# Módulo de Gestión de Imágenes (Público/Galería)
app.include_router(images.router, prefix="/api/images", tags=["Imágenes (Tienda)"])

# Módulo de Gestión de Personalización
app.include_router(customization.router, prefix="/api/admin/customization", tags=["Admin: Personalización"])

# WebSocket
app.include_router(websocket.router, prefix="/api", tags=["WebSocket (Real-Time)"])


# Endpoints de "Ping"
@app.get("/")
async def root():
    return {"message": "ecommerce-playground API v2.1 (RBAC)", "status": "running"}


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected" if db_manager and db_manager.is_initialized else "disconnected",
    }
