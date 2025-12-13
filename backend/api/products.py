"""
API Router para productos
REFACTORIZADO:
- Se eliminó la lógica duplicada de carga de imágenes (ahora en api/images.py).
- Se usan DTOs de Intención (ProductCreate, ProductUpdate) para seguridad.
- Se actualizó el inyector de dependencias.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body, Request
from typing import List, Optional, Dict, Any

import logging

logger = logging.getLogger(__name__)

# REFACTOR: Importar los DTOs de Intención
from ..models.base import Product, ProductCard, ProductCreate, ProductUpdate
from ..services.product_service import ProductService
from ..database.manager import DatabaseManager
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

@router.get("/", response_model=List[Product])
async def get_products(
    category: Optional[str] = Query(None, description="Filtrar por categoría"),
    featured: bool = Query(False, description="Obtener solo productos destacados"),
    discount: bool = Query(False, description="Obtener solo productos con descuento"),
    service: ProductService = Depends(get_product_service)
):
    """
    Obtener lista de productos con filtros opcionales.
    (Cumple con 'single-e-commerce-demo.docx' - sliders)
    """
    try:
        products = await service.get_all_products(
            category=category,
            featured_only=featured,
            discount_only=discount
        )
        return products
    except Exception as e:
        logger.error(f"Error al obtener productos: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search", response_model=List[Product])
async def search_products(
    q: str = Query(..., min_length=2, description="Término de búsqueda"),
    service: ProductService = Depends(get_product_service)
):
    """
    Buscar productos por nombre, descripción, SKU o categoría.
    (Cumple con 'single-e-commerce-demo.docx' - barra de búsqueda)
    """
    try:
        products = await service.search_products(q)
        return products
    except Exception as e:
        logger.error(f"Error al buscar productos '{q}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/slider/{slider_type}", response_model=List[ProductCard])
async def get_slider_products(
    slider_type: str,
    service: ProductService = Depends(get_product_service)
):
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
async def get_product(
    product_id: str,
    service: ProductService = Depends(get_product_service)
):
    """Obtener un producto específico por su ID."""
    product = await service.get_product(product_id)
    if not product:
        logger.warning(f"Producto no encontrado: {product_id}")
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product

# --- Endpoints de Admin (Escritura Protegida) ---

@router.post("/", response_model=Product, status_code=201)
async def create_product(
    product_data: ProductCreate, # REFACTOR: Usa el DTO de Creación
    service: ProductService = Depends(get_product_service),
    current_user: dict = Depends(get_current_user)
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
    product_updates: ProductUpdate, # REFACTOR: Usa el DTO de Actualización
    service: ProductService = Depends(get_product_service),
    current_user: dict = Depends(get_current_user)
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


@router.delete("/{product_id}", response_model=Dict[str, str])
async def delete_product(
    product_id: str,
    service: ProductService = Depends(get_product_service),
    current_user: dict = Depends(get_current_user)
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


# REFACTOR: Endpoint 'upload_product_image' ELIMINADO.
# Esta lógica ahora vive centralizada en 'backend/api/images.py',
# que es el siguiente módulo que auditaremos.