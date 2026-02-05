"""
API Router para productos
REFACTORIZADO:
- Se eliminó la lógica duplicada de carga de imágenes (ahora en api/images.py).
- Se usan DTOs de Intención (ProductCreate, ProductUpdate) para seguridad.
- Se actualizó el inyector de dependencias.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile

logger = logging.getLogger(__name__)

# REFACTOR: Importar los DTOs de Intención
from ..models import Product, ProductCard, ProductCreate, ProductUpdate
from ..services.product_service import ProductService
from ..utils.auth import get_current_user

router = APIRouter()

# --- Inyección de Dependencias ---


def get_product_service(request: Request):
    """
    REFACTOR: Inyector de dependencias actualizado.
    Obtiene la instancia global del servicio desde main.py.
    """
    if not hasattr(request.app.state, "product_service") or not request.app.state.product_service:
        raise HTTPException(status_code=503, detail="Servicio de productos no inicializado.")
    return request.app.state.product_service


# --- Endpoints Públicos (Lectura) ---


@router.get("/", response_model=list[Product])
async def get_products(
    category: str | None = Query(None, description="Filtrar por categoría"),
    featured: bool = Query(False, description="Obtener solo productos destacados"),
    discount: bool = Query(False, description="Obtener solo productos con descuento"),
    skip: int = Query(0, description="Registros a saltar (Paginación)"),
    limit: int = Query(20, description="Límite de registros (Paginación)"),
    service: ProductService = Depends(get_product_service),
):
    """
    Obtener lista de productos con filtros opcionales.
    (Cumple con 'single-e-commerce-demo.docx' - sliders)
    """
    try:
        products = await service.get_all_products(
            category=category,
            featured_only=featured,
            discount_only=discount,
            skip=skip,
            limit=limit,
        )
        return products
    except Exception as e:
        logger.error(f"Error al obtener productos: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search", response_model=list[Product])
async def search_products(
    q: str = Query(..., min_length=2, description="Término de búsqueda"),
    limit: int = Query(20, description="Límite de resultados"),
    service: ProductService = Depends(get_product_service),
):
    """
    Buscar productos por nombre, descripción, SKU o categoría.
    (Cumple con 'single-e-commerce-demo.docx' - barra de búsqueda)
    """
    try:
        products = await service.search_products(q, limit=limit)
        return products
    except Exception as e:
        logger.error(f"Error al buscar productos '{q}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/slider/{slider_type}", response_model=list[ProductCard])
async def get_slider_products(slider_type: str, service: ProductService = Depends(get_product_service)):
    """
    Obtener productos formateados para un slider (main, featured, discount).
    (Cumple con 'single-e-commerce-demo.docx' - sliders)
    """
    if slider_type not in ["main", "featured", "discount"]:
        raise HTTPException(status_code=400, detail="Tipo de slider no válido. Usar 'main', 'featured' o 'discount'.")
    try:
        cards = await service.get_products_for_slider(slider_type)
        return cards
    except Exception as e:
        logger.error(f"Error al obtener productos para slider '{slider_type}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: str, service: ProductService = Depends(get_product_service)):
    """Obtener un producto específico por su ID."""
    product = await service.get_product(product_id)
    if not product:
        logger.warning(f"Producto no encontrado: {product_id}")
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


# --- Endpoints de Admin (Escritura Protegida) ---


@router.post("/", response_model=Product, status_code=201)
async def create_product(
    product_data: ProductCreate,  # REFACTOR: Usa el DTO de Creación
    service: ProductService = Depends(get_product_service),
    current_user: dict = Depends(get_current_user),
):
    """
    Crear un nuevo producto.
    (Cumple con 'single-e-commerce-demo.docx' - modulo de productos)
    """
    try:
        # Convertir el DTO de Creación al DTO completo de Producto
        # que el servicio espera (añadiendo id, timestamps, etc.)
        product = Product(**product_data.model_dump())
        new_product = await service.create_product(product)
        return new_product
    except ValueError as e:
        logger.warning(f"Error de validación al crear producto: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error al crear producto: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{product_id}", response_model=Product)
async def update_product(
    product_id: str,
    product_updates: ProductUpdate,  # REFACTOR: Usa el DTO de Actualización
    service: ProductService = Depends(get_product_service),
    current_user: dict = Depends(get_current_user),
):
    """
    Actualizar un producto existente.
    (Cumple con 'single-e-commerce-demo.docx' - modulo de productos)
    """
    try:
        # .model_dump(exclude_unset=True) envía *solo* los campos que
        # el frontend envió, perfecto para una actualización parcial (PATCH).
        updates_dict = product_updates.model_dump(exclude_unset=True)

        if not updates_dict:
            raise HTTPException(status_code=400, detail="No se enviaron campos para actualizar.")

        product = await service.update_product(product_id, updates_dict)
        if not product:
            logger.warning(f"Intento de actualizar producto no existente: {product_id}")
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return product
    except ValueError as e:
        logger.warning(f"Error de validación al actualizar producto '{product_id}': {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error al actualizar producto '{product_id}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{product_id}", response_model=dict[str, str])
async def delete_product(
    product_id: str,
    service: ProductService = Depends(get_product_service),
    current_user: dict = Depends(get_current_user),
):
    """
    Eliminar un producto.
    (Cumple con 'single-e-commerce-demo.docx' - modulo de productos)
    """
    try:
        success = await service.delete_product(product_id)
        if success:
            return {"message": "Producto eliminado exitosamente"}

        logger.warning(f"Intento de eliminar producto no existente: {product_id}")
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    except ValueError as e:
        logger.warning(f"Error de validación al eliminar producto '{product_id}': {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error al eliminar producto '{product_id}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/with-image", response_model=Product, status_code=201)
async def create_product_with_image(
    request: Request,
    name: str = Form(...),
    price: float = Form(...),
    description: str = Form(""),
    sku: str = Form(""),
    stock: int = Form(0),
    category: str = Form(""),
    is_featured: str = Form("false"),  # Recibir como string
    is_discount: str = Form("false"),  # Recibir como string
    discount_percentage: float = Form(0.0),
    banner_assignment: str = Form("main"),
    file: UploadFile | None = File(None),
    service: ProductService = Depends(get_product_service),
    current_user: dict = Depends(get_current_user),
):
    """
    Crear un producto con imagen en una sola llamada.
    Compatible con formularios multipart/form-data.
    Genera automáticamente thumbnail + imagen full size.
    """
    from ..services.image_service import ImageService

    # Parsear booleans desde strings (FormData siempre envía strings)
    is_featured_bool = is_featured.lower() in ("true", "1", "yes")
    is_discount_bool = is_discount.lower() in ("true", "1", "yes")

    try:
        # 1. Crear el producto
        product_data = ProductCreate(
            name=name,
            price=price,
            description=description,
            sku=sku,
            stock=stock,
            category=category,
            is_featured=is_featured_bool,
            is_discount=is_discount_bool,
            discount_percentage=discount_percentage,
            banner_assignment=banner_assignment,
        )
        product = Product(**product_data.model_dump())
        new_product = await service.create_product(product)

        # 2. Si hay imagen, procesarla con múltiples tamaños
        if file and file.filename:
            image_service: ImageService = request.app.state.image_service
            if not image_service:
                logger.warning("ImageService no disponible, producto creado sin imagen")
            else:
                file_data = await file.read()
                # Genera imagen full + thumbnail
                image_url = image_service.process_and_save_multi_size(
                    file_data=file_data,
                    original_filename=file.filename,
                    save_filename=new_product.id,
                    folder="products",
                )
                # Actualizar el producto con la URL de la imagen
                new_product = await service.update_product(new_product.id, {"image_url": image_url})

        return new_product

    except ValueError as e:
        logger.warning(f"Error de validación al crear producto con imagen: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error al crear producto con imagen: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# REFACTOR: Endpoint 'upload_product_image' ELIMINADO en favor de api/images.py
# PERO: Añadimos endpoints para MULTI-IMAGEN (nueva feature)


@router.get("/{product_id}/images", response_model=list[dict[str, Any]])
async def get_product_images(product_id: str, service: ProductService = Depends(get_product_service)):
    """Obtener todas las imágenes de un producto."""
    images = await service.get_product_images(product_id)
    return images


@router.post("/{product_id}/images", status_code=201)
async def add_product_image(
    product_id: str,
    request: Request,
    file: UploadFile = File(...),
    is_main: bool = Form(False),
    service: ProductService = Depends(get_product_service),
):
    """
    Subir una imagen adicional a un producto existente (Máximo 5).
    """
    from ..services.image_service import ImageService

    try:
        image_service: ImageService = request.app.state.image_service
        if not image_service:
            raise HTTPException(status_code=503, detail="Servicio de imágenes no disponible.")

        file_data = await file.read()
        import uuid

        image_uuid = str(uuid.uuid4())

        # Procesar imagen (Guardar física)
        # Usamos image_uuid como nombre de archivo para evitar colisiones
        image_url = image_service.process_and_save_multi_size(
            file_data=file_data,
            original_filename=file.filename or "image.jpg",
            save_filename=f"{product_id}_{image_uuid}",
            folder="products",
        )

        # Registrar en DB
        result = await service.add_product_image(product_id, image_url, is_main=is_main)
        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error subiendo imagen extra: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{product_id}/images/{image_id}")
async def delete_product_image(
    product_id: str,
    image_id: str,
    service: ProductService = Depends(get_product_service),
    current_user: dict = Depends(get_current_user),
):
    """Eliminar una imagen específica."""
    try:
        await service.delete_product_image(product_id, image_id)
        return {"message": "Imagen eliminada"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error eliminando imagen {image_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno")


@router.put("/{product_id}/images/{image_id}/main")
async def set_main_image(
    product_id: str,
    image_id: str,
    service: ProductService = Depends(get_product_service),
    current_user: dict = Depends(get_current_user),
):
    """Establecer imagen como principal."""
    try:
        await service.set_main_image(product_id, image_id)
        return {"message": "Imagen principal actualizada"}
    except Exception as e:
        logger.error(f"Error setting main image: {e}")
        raise HTTPException(status_code=500, detail=str(e))
