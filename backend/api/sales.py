"""
API Router para Ventas
REFACTORIZADO: Endpoints desacoplados. Llaman al SalesService.
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Dict, Any
from datetime import date

# Importar Modelos DTO
from ..models.base import Sale, DailyReport, PaymentDetails
# Importar Servicios
from ..services.sales_service import SalesService
from ..services.cart_service import CartService
from ..services.product_service import ProductService
from ..database.manager import DatabaseManager # Import DatabaseManager

# Importar Seguridad y Dependencias
from ..utils.auth import get_current_user
from ..utils.dependencies import get_db_manager, get_cart_service, get_product_service

router = APIRouter()

# --- Inyección de Dependencias ---

def get_sales_service(
    db_manager: DatabaseManager = Depends(get_db_manager),
    cart_service: CartService = Depends(get_cart_service),
    product_service: ProductService = Depends(get_product_service)
):
    """
    Inyector de dependencias para SalesService.
    Obtiene las instancias de servicio a través de FastAPI Depends.
    """
    return SalesService(
        db_manager=db_manager,
        cart_service=cart_service,
        product_service=product_service
    )

# --- Endpoints de la API de Ventas (Protegidos) ---

@router.post("/{cart_id}/complete", response_model=Sale)
async def complete_sale(
    cart_id: str,
    payment_details: PaymentDetails = Body(...), # DTO de Pydantic
    current_user: dict = Depends(get_current_user),
    service: SalesService = Depends(get_sales_service)
):
    """
    Completar una venta desde un carrito.
    Esto actualiza el inventario y crea el registro de venta.
    """
    try:
        username = current_user.get("username", "admin")
        sale = await service.complete_sale(cart_id, payment_details, username)
        return sale
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Captura genérica (ej. error de BD)
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {e}")

@router.post("/{cart_id}/cancel", response_model=Dict[str, str])
async def cancel_sale(
    cart_id: str,
    current_user: dict = Depends(get_current_user),
    service: SalesService = Depends(get_sales_service)
):
    """Anular un carrito pendiente (no revierte stock)."""
    try:
        username = current_user.get("username", "admin")
        return await service.cancel_sale(cart_id, username)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/daily", response_model=DailyReport)
async def get_daily_sales(
    current_user: dict = Depends(get_current_user),
    service: SalesService = Depends(get_sales_service)
):
    """Obtener el reporte de ventas del día actual."""
    return await service.get_daily_report()

@router.post("/close-day", response_model=Dict[str, Any])
async def close_day(
    current_user: dict = Depends(get_current_user),
    service: SalesService = Depends(get_sales_service)
):
    """
    Cerrar el día y generar el resumen final de ventas.
    (Cumple con el submódulo de cierre de 'single-e-commerce-demo.docx')
    """
    try:
        username = current_user.get("username", "admin")
        return await service.close_day_report(username)
    except ValueError as e:
        # Error si el día ya fue cerrado
        raise HTTPException(status_code=400, detail=str(e))