"""
API Router para Finanzas
REFACTORIZADO: Endpoints de impuestos eliminados y desacoplados.
Añadida seguridad RBAC (solo 'finance_manager' o 'admin' pueden modificar).
"""

from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from ..models import Currency

# Importa el servicio refactorizado
from ..services.finance_service import FinanceService

# REFACTOR: Importar los nuevos guardianes de RBAC
from ..utils.auth import is_finance_manager

router = APIRouter()

# --- Dependencia ---


def get_finance_service(request: Request):
    """Dependencia para inyectar el FinanceService"""
    if not hasattr(request.app.state, "finance_service") or not request.app.state.finance_service:
        raise HTTPException(status_code=503, detail="Servicio financiero no inicializado.")
    return request.app.state.finance_service


# --- Endpoints Públicos (Lectura) ---


@router.get("/currencies", response_model=list[Currency])
async def get_currencies(service: FinanceService = Depends(get_finance_service)):
    """Obtener todas las monedas activas (Público)"""
    return await service.get_all_currencies()


@router.get("/currencies/base", response_model=Currency)
async def get_base_currency(service: FinanceService = Depends(get_finance_service)):
    """Obtener la moneda base del sistema (Público)"""
    currency = await service.get_base_currency()
    if not currency:
        raise HTTPException(status_code=404, detail="No hay moneda base configurada")
    return currency


@router.get("/price-conversion", response_model=dict[str, Any])
async def get_price_conversion(
    amount_in_base: float, to_currency_id: str, service: FinanceService = Depends(get_finance_service)
):
    """
    Devuelve la conversión de un precio base a una moneda destino,
    sin aplicar impuestos. Útil para el frontend (Público).
    """
    try:
        return await service.convert_price_to_currency(Decimal(str(amount_in_base)), to_currency_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Endpoints de Admin (Escritura Protegida por RBAC) ---


@router.post(
    "/currencies", response_model=Currency, status_code=201, dependencies=[Depends(is_finance_manager)]
)  # RBAC
async def create_currency(
    name: str = Query(...),
    symbol: str = Query(...),
    exchange_rate: float = Query(1.0),
    is_base: bool = Query(False),
    service: FinanceService = Depends(get_finance_service),
):
    """
    Crear una nueva moneda.
    REFACTOR: 'tax_percentage' eliminado.
    (Protegido: 'admin', 'finance_manager')
    """
    try:
        currency = await service.create_currency(
            name=name, symbol=symbol, is_base=is_base, exchange_rate=Decimal(str(exchange_rate))
        )
        return currency
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put(
    "/currencies/{currency_id}/rate", response_model=Currency, dependencies=[Depends(is_finance_manager)]
)  # RBAC
async def update_exchange_rate(
    currency_id: str, new_rate: float = Query(..., gt=0), service: FinanceService = Depends(get_finance_service)
):
    """
    Actualizar la tasa de cambio de una moneda (NO base).
    (Protegido: 'admin', 'finance_manager')
    """
    try:
        currency = await service.update_exchange_rate(currency_id, Decimal(str(new_rate)))
        if not currency:
            raise HTTPException(status_code=404, detail="Moneda no encontrada")
        return currency
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put(
    "/currencies/{currency_id}/set-base", response_model=dict[str, Any], dependencies=[Depends(is_finance_manager)]
)  # RBAC
async def set_base_currency(currency_id: str, service: FinanceService = Depends(get_finance_service)):
    """
    Establece una moneda como la nueva base del sistema (Migración Controlada).
    Recalcula todas las demás tasas en relación a esta.
    (Protegido: 'admin', 'finance_manager')
    """
    try:
        result = await service.set_base_currency(currency_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete(
    "/currencies/{currency_id}", response_model=dict[str, Any], dependencies=[Depends(is_finance_manager)]
)  # RBAC
async def delete_currency(currency_id: str, service: FinanceService = Depends(get_finance_service)):
    """
    Desactivar una moneda.
    REGLA SAP: No se puede eliminar la moneda base.
    (Protegido: 'admin', 'finance_manager')
    """
    try:
        return await service.delete_currency(currency_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# REFACTOR: Endpoint 'set_tax' eliminado.
# REFACTOR: Endpoint 'POST /convert' (con 'apply_tax') eliminado.
