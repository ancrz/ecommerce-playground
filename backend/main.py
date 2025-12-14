"""
Farmalux E-commerce - Servidor Principal (Orquestador)
REFACTORIZADO (v2.1 RBAC + Impuestos):
- Implementa la inicialización controlada (lifespan)[cite: 70].
- Instancia e inyecta TODOS los servicios (DI).
- Registra TODOS los routers (incluyendo los nuevos) con seguridad RBAC.
"""

import asyncio
import os
from pathlib import Path
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Cargar variables de entorno (para DB_PATH, ADMIN_PASSWORD, etc.) [cite: 56]
load_dotenv()

# Configurar logging (centralizado)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configurar logger específico para backend.utils.auth
auth_logger = logging.getLogger("backend.utils.auth")
auth_logger.setLevel(logging.DEBUG)

# Configurar logs por módulo
try:
    from .utils.logging import setup_logs
    setup_logs()
except ImportError:
    logger.warning("No se pudo cargar backend.utils.logging")
except Exception as e:
    logger.error(f"Error configurando logs granulares: {e}")

# --- 1. Importar Módulos Base ---
from .database.manager import DatabaseManager # [cite: 124]
from .models.base import Product, User, Region, TaxRate # (y otros DTOs) [cite: 126]

# --- 2. Importar Servicios --- [cite: 127]
from .services.product_service import ProductService # [cite: 128]
from .services.finance_service import FinanceService # [cite: 129]
from .services.cart_service import CartService # [cite: 130]
# (Importar servicios refactorizados/nuevos)
from .services.tax_service import TaxService
from .services.sales_service import SalesService
from .services.image_service import ImageService
from .services.business_service import BusinessService
from .services.user_service import UserService
from .services.customization_service import CustomizationService # NEW

# --- 3. Importar Routers (APIs) --- [cite: 132]
from .api import (
    auth, business, cart, customization, finance, 
    images, products, sales, 
    # (Importar routers nuevos)
    tax_admin, user_admin, client_logs # NEW
)

# --- 4. Importar Guardianes RBAC ---
from .utils.auth import (
    is_admin, is_products_manager, is_sales_manager,
    is_finance_manager, is_content_manager,
    RoleChecker # Importar RoleChecker
)

# Definir una dependencia local para el rol de administrador
def get_admin_role_checker():
    return RoleChecker(["admin"])

# --- 5. Contenedor de Inyección de Dependencias (DI) ---
# Estas variables globales contendrán las instancias de nuestros servicios.
# Serán inicializadas en el 'lifespan' (Paso 6).
# Los inyectores (ej. get_product_service) en los archivos API las importarán.

db_manager: DatabaseManager = None
product_service: ProductService = None
finance_service: FinanceService = None
tax_service: TaxService = None
cart_service: CartService = None
sales_service: SalesService = None
image_service: ImageService = None
business_service: BusinessService = None
user_service: UserService = None
customization_service: CustomizationService = None # NEW


# --- 6. Inicialización Controlada (Lifespan) ---
# (Cumple con la premisa: "la base de datos sube primero y lo demás paulatinamente") [cite: 70]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestión del ciclo de vida de la aplicación"""
    # Hacer globales las variables para que los inyectores las vean
    global db_manager, product_service, finance_service, tax_service
    global cart_service, sales_service, image_service, business_service, user_service
    global customization_service # NEW
    
    logger.info("🚀 Iniciando Farmalux E-commerce (v2.1 RBAC)...")
    
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
    image_service = ImageService(upload_path=upload_path) # Utility service
    app.state.image_service = image_service # <-- CORRECCIÓN FASE 1
    user_service = UserService(db_manager=db_manager)
    # Almacenar servicios en app.state para inyección de dependencias
    app.state.user_service = user_service
    business_service = BusinessService(db_manager=db_manager, image_service=image_service)
    app.state.business_service = business_service
    product_service = ProductService(db_manager=db_manager)
    app.state.product_service = product_service
    finance_service = FinanceService(db_manager=db_manager)
    app.state.finance_service = finance_service
    tax_service = TaxService(db_manager=db_manager)
    app.state.tax_service = tax_service
    customization_service = CustomizationService(db_manager=db_manager, image_service=image_service) # NEW
    app.state.customization_service = customization_service # NEW
    
    # Servicios Nivel 1 (Integradores)
    cart_service = CartService(
        db_manager=db_manager,
        product_service=product_service, # Dependencia
        tax_service=tax_service           # Dependencia
    )
    app.state.cart_service = cart_service
    sales_service = SalesService(
        db_manager=db_manager,
        cart_service=cart_service,     # Dependencia
        product_service=product_service  # Dependencia
    )
    logger.info("✓ Todos los servicios están inicializados.")
    
    # Paso 3: Asegurar carpetas de 'uploads' (del ImageService) [cite: 71]
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
    await db_manager.close()
    logger.info("✓ Conexiones a Base de Datos cerradas.")

# --- 8. Crear aplicación FastAPI ---
app = FastAPI(
    title="Farmalux E-commerce API",
    description="API para sistema de e-commerce de farmacia (Arquitectura de Servicios Refactorizada v2.1)",
    version="2.1.0-RBAC",
    lifespan=lifespan # ¡Usar la inicialización controlada!
)

# Configurar CORS (Permitir que el frontend React se conecte)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción: ["http://localhost:5173", "https://tu.dominio.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar carpeta de uploads como archivos estáticos [cite: 214]
# (Permite que el frontend vea /uploads/products/abc.jpg)
app.mount(
    "/uploads", 
    StaticFiles(directory=os.getenv("UPLOAD_PATH", "./data/uploads")),
    name="uploads"
)

# --- 9. Registrar Routers (APIs) con Seguridad RBAC ---
logger.info("Registrando routers de API...")

# --- APIs Públicas (Autenticación y Tienda) ---
# (Cualquiera puede acceder)
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación y Autogestión"])
app.include_router(products.router, prefix="/api/products", tags=["Productos (Tienda)"])
app.include_router(finance.router, prefix="/api/finance", tags=["Finanzas (Tienda)"])
app.include_router(business.router, prefix="/api/business", tags=["Negocio (Tienda)"])
app.include_router(cart.router, prefix="/api/cart", tags=["Carrito (Tienda)"])
app.include_router(client_logs.router, prefix="/api/client-logs", tags=["Observabilidad"]) # NEW

# --- APIs de Administración (Protegidas por RBAC) ---
# (Solo usuarios logueados con roles específicos pueden acceder)

# Módulo de Gestión de Negocio (Admin y Content Manager)
app.include_router(
    business.router,
    prefix="/api/admin/business",
    tags=["Admin: Gestión de Negocio"],
    dependencies=[Depends(is_content_manager)]
)

# Módulo de Gestión de Usuarios (Solo "admin")
app.include_router(
    user_admin.router, 
    prefix="/api/admin/users", 
    tags=["Admin: Gestión de Usuarios"],
    dependencies=[Depends(get_admin_role_checker)] # ¡Protegido!
)
# Módulo de Gestión de Ventas (Admin y Sales)
app.include_router(
    sales.router, 
    prefix="/api/admin/sales", 
    tags=["Admin: Ventas y Cierre"],
    dependencies=[Depends(is_sales_manager)] # ¡Protegido!
)
# Módulo de Gestión de Impuestos (Admin y Finanzas)
app.include_router(
    tax_admin.router, 
    prefix="/api/admin/tax", 
    tags=["Admin: Impuestos y Regiones"]
    # dependencies=[Depends(is_finance_manager)] <-- ELIMINADO: Controlado internamente en tax_admin.py
)
# Módulo de Gestión de Imágenes (Admin y Managers de Contenido/Productos)
app.include_router(
    images.router, 
    prefix="/api/admin/images", 
    tags=["Admin: Carga de Imágenes"],
    # Proteger a nivel de endpoint es más granular,
    # pero para este módulo, lo protegemos para roles de contenido.
    dependencies=[Depends(is_content_manager | is_products_manager)] 
)
# Módulo de Gestión de Personalización (Admin y Content Manager)
app.include_router(customization.router, prefix="/api/admin/customization", tags=["Admin: Personalización"]) # NEW - Controlado internamente
# Módulo de Gestión de Productos (Admin y Products)
# (NOTA: Los endpoints públicos de products.py ya están registrados arriba)
# (Aquí podríamos registrar endpoints *solo* de admin si los tuviéramos separados)
# app.include_router(..., dependencies=[Depends(is_products_manager)])

# Endpoints de "Ping"
@app.get("/")
async def root():
    return {
        "message": "Farmalux E-commerce API v2.1 (RBAC)",
        "status": "running"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected" if db_manager and db_manager.is_initialized else "disconnected"
    }

# (start.py maneja la ejecución, no es necesario __main__)