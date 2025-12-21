"""
API Router para la Carga de Imágenes
REFACTORIZADO: Este es un "Orquestador".
No contiene lógica de negocio. Llama al ImageService para guardar el archivo
y luego llama al servicio correspondiente (ProductService, BusinessService)
para actualizar la URL en la base de datos.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form, Request # <-- CORRECCIÓN FASE 1: Importar Request
from typing import Optional, List, Dict, Any
import logging

# Importar Servicios
from ..services.image_service import ImageService
from ..services.product_service import ProductService
from ..services.business_service import BusinessService, BusinessInfoUpdate

# Importar DTOs
from ..models.base import Product, BusinessInfo, ProductUpdate
from ..utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Inyección de Dependencias (Refactorizado) ---

def get_image_service(request: Request): # <-- CORRECCIÓN FASE 1
    """Inyector para el servicio de procesamiento de imágenes"""
    if not hasattr(request.app.state, "image_service") or not request.app.state.image_service:
        raise HTTPException(status_code=503, detail="Servicio de imágenes no inicializado.")
    return request.app.state.image_service

def get_product_service(request: Request): # <-- CORRECCIÓN FASE 1
    """Inyector para el servicio de productos"""
    if not hasattr(request.app.state, "product_service") or not request.app.state.product_service:
        raise HTTPException(status_code=503, detail="Servicio de productos no inicializado.")
    return request.app.state.product_service

def get_business_service(request: Request): # <-- CORRECCIÓN FASE 1
    """Inyector para el servicio de negocio"""
    if not hasattr(request.app.state, "business_service") or not request.app.state.business_service:
        raise HTTPException(status_code=503, detail="Servicio de negocio no inicializado.")
    return request.app.state.business_service


# --- Endpoints de Carga de Imágenes (Protegidos) ---
# (No se requieren cambios en los endpoints, ya que Depends()
# usará los nuevos getters automáticamente)

@router.post("/products/{product_id}/upload", response_model=Product)
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    image_service: ImageService = Depends(get_image_service),
    product_service: ProductService = Depends(get_product_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Orquesta la subida de una imagen para un producto:
    1. Procesa y guarda el archivo físico (usando ImageService).
    2. Actualiza la 'image_url' del producto en la DB (usando ProductService).
    """
    
    # Validar que el producto existe ANTES de procesar la imagen
    product = await product_service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    try:
        file_data = await file.read()
        
        # Paso 1: Guardar el archivo físico (Full + Thumbnail)
        # Usa el product_id como nombre de archivo para evitar duplicados
        image_url = image_service.process_and_save_multi_size(
            file_data=file_data,
            original_filename=file.filename,
            save_filename=product_id, # Guarda como "product_id.jpg" + "product_id_thumb.jpg"
            folder="products"
        )
        
        # (Opcional) Borrar la imagen anterior si existía
        if product.image_url and product.image_url != image_url:
            image_service.delete_image(product.image_url)

        # Paso 2: Actualizar la URL en la base de datos
        # Usamos el DTO ProductUpdate para una actualización segura
        update_dto = ProductUpdate(image_url=image_url)
        updated_product = await product_service.update_product(
            product_id, 
            updates=update_dto.model_dump(exclude_none=True)
        )
        
        return updated_product
        
    except ValueError as e: # Error de validación de imagen (ImageService)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error al subir imagen para producto {product_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error procesando imagen: {str(e)}")


@router.delete("/products/{product_id}/image", response_model=Product)
async def delete_product_image(
    product_id: str,
    image_service: ImageService = Depends(get_image_service),
    product_service: ProductService = Depends(get_product_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Orquesta la eliminación de la imagen de un producto:
    1. Obtiene la URL de la imagen (usando ProductService).
    2. Borra el archivo físico (usando ImageService).
    3. Pone la 'image_url' a NULL en la DB (usando ProductService).
    """
    product = await product_service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if not product.image_url:
        return product # No hay imagen para borrar

    try:
        # Paso 1: Borrar el archivo físico
        image_service.delete_image(product.image_url)
        
        # Paso 2: Actualizar la URL en la base de datos (Poner a NULL explícitamente)
        updated_product = await product_service.update_product(
            product_id, 
            updates={"image_url": None}
        )
        return updated_product
        
    except Exception as e:
        logger.error(f"Error al eliminar imagen de producto {product_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/business/logo", response_model=BusinessInfo)
async def upload_business_logo(
    file: UploadFile = File(...),
    image_service: ImageService = Depends(get_image_service),
    business_service: BusinessService = Depends(get_business_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Orquesta la subida del logo del negocio:
    1. Procesa y guarda el archivo (usando ImageService).
    2. Actualiza la 'logo_url' en la DB (usando BusinessService).
    """
    try:
        file_data = await file.read()
        
        # Paso 1: Guardar el archivo físico
        image_url = image_service.process_and_save(
            file_data=file_data,
            original_filename=file.filename,
            save_filename="business_logo", # Nombre de archivo estático
            folder="logos"
        )
        
        # Paso 2: Actualizar la URL en la base de datos
        # (Nota: El BusinessService fue refactorizado para NO tener update_logo_url)
        # (El servicio original solo tenía update_business_info)
        # (Usamos el DTO de actualización)
        update_dto = BusinessInfoUpdate(logo_url=image_url)
        updated_info = await business_service.update_business_info(update_dto)
        return updated_info
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error al subir logo: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/business/icon", response_model=BusinessInfo)
async def upload_business_icon(
    file: UploadFile = File(...),
    image_service: ImageService = Depends(get_image_service),
    business_service: BusinessService = Depends(get_business_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Orquesta la subida del icono del negocio:
    1. Procesa y guarda el archivo (usando ImageService).
    2. Actualiza la 'icon_url' en la DB (usando BusinessService).
    """
    try:
        file_data = await file.read()
        
        # Paso 1: Guardar el archivo físico
        image_url = image_service.process_and_save(
            file_data=file_data,
            original_filename=file.filename,
            save_filename="business_icon", # Nombre de archivo estático
            folder="icons"
        )
        
        # Paso 2: Actualizar la URL en la base de datos
        # (Usamos el DTO de actualización)
        update_dto = BusinessInfoUpdate(icon_url=image_url)
        updated_info = await business_service.update_business_info(update_dto)
        return updated_info
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error al subir icono: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/business/banner", response_model=BusinessInfo)
async def upload_business_banner(
    file: UploadFile = File(...),
    image_service: ImageService = Depends(get_image_service),
    business_service: BusinessService = Depends(get_business_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Orquesta la subida del banner del negocio:
    1. Procesa y guarda el archivo (usando ImageService).
    2. Actualiza la 'banner_url' en la DB (usando BusinessService).
    """
    try:
        file_data = await file.read()
        
        # Paso 1: Guardar el archivo físico
        image_url = image_service.process_and_save(
            file_data=file_data,
            original_filename=file.filename,
            save_filename="business_banner", # Nombre de archivo estático
            folder="logos"
        )
        
        # Paso 2: Actualizar la URL en la base de datos
        # (Usamos el DTO de actualización)
        update_dto = BusinessInfoUpdate(banner_url=image_url)
        updated_info = await business_service.update_business_info(update_dto)
        return updated_info
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error al subir banner: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))