"""
API Router para Ventas
REFACTORIZADO: Endpoints desacoplados. Llaman al SalesService.
"""

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException

# Importar Modelos DTO
from ..models import DailyReport, PaymentDetails, Sale

# Importar Servicios
from ..services.sales_service import SalesService

# Importar Seguridad y Dependencias
from ..utils.auth import get_current_user, is_sales_manager
from ..utils.dependencies import get_sales_service

router = APIRouter()


# --- Endpoints de la API de Ventas (Protegidos) ---


@router.post("/{cart_id}/complete", response_model=Sale)
async def complete_sale(
    cart_id: str,
    payment_details: PaymentDetails = Body(...),  # DTO de Pydantic
    current_user: dict = Depends(get_current_user),
    service: SalesService = Depends(get_sales_service),
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


@router.post("/{cart_id}/cancel", response_model=dict[str, str])
async def cancel_sale(
    cart_id: str, current_user: dict = Depends(get_current_user), service: SalesService = Depends(get_sales_service)
):
    """Anular un carrito pendiente (no revierte stock)."""
    try:
        username = current_user.get("username", "admin")
        return await service.cancel_sale(cart_id, username)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/daily", response_model=DailyReport, dependencies=[Depends(is_sales_manager)])
async def get_daily_sales(
    current_user: dict = Depends(get_current_user), service: SalesService = Depends(get_sales_service)
):
    """Obtener el reporte de ventas del día actual."""
    return await service.get_daily_report()


@router.post("/close-day", response_model=dict[str, Any], dependencies=[Depends(is_sales_manager)])
async def close_day(current_user: dict = Depends(get_current_user), service: SalesService = Depends(get_sales_service)):
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
