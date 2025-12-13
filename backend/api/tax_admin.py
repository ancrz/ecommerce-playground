"""
¡NUEVO ARCHIVO API!
API Router para la Administración de Impuestos (Regiones y Tasas).
Cumple con la lógica de impuestos regionales (Filadelfia 6% + 2%).
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body, Path, Request
from typing import List, Optional, Dict, Any
from decimal import Decimal
from pydantic import Field

# Importa el nuevo servicio y modelos
from ..services.tax_service import TaxService
from ..models.base import Region, TaxRate, BaseModel # Importar BaseModel
# REFACTOR: Importar el guardián de rol RBAC
from ..utils.auth import is_finance_manager

router = APIRouter()

# --- DTOs de Intención (para PUT/PATCH) ---

class RegionUpdate(BaseModel):
    """DTO para actualizar campos de una Región"""
    name: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    is_active: Optional[bool] = None

class TaxRateUpdate(BaseModel):
    """DTO para actualizar campos de una Tasa de Impuesto"""
    name: Optional[str] = None
    rate: Optional[float] = Field(None, ge=0, lt=1, description="Tasa como decimal (ej: 0.06)")
    priority: Optional[int] = None
    is_active: Optional[bool] = None

# --- Dependencia ---

def get_tax_service(request: Request):
    """Dependencia para inyectar el TaxService"""
    if not hasattr(request.app.state, "tax_service") or not request.app.state.tax_service:
        raise HTTPException(status_code=503, detail="Servicio de impuestos no inicializado.")
    return request.app.state.tax_service

# --- Endpoints de Regiones Fiscales (Protegidos) ---

@router.get("/regions", response_model=List[Region])
async def get_regions(
    active_only: bool = Query(True, description="Mostrar solo regiones activas"),
    service: TaxService = Depends(get_tax_service)
):
    """
    Obtener todas las regiones fiscales.
    (Protegido: 'admin', 'finance_manager')
    """
    return await service.get_regions(active_only=active_only)

@router.post("/regions", response_model=Region, status_code=201,
             dependencies=[Depends(is_finance_manager)]) # RBAC
async def create_region(
    name: str = Query(..., description="Nombre de la región (ej. Filadelfia, PA)"),
    country: str = Query(None, description="País (ej. USA)"),
    state: str = Query(None, description="Estado (ej. PA)"),
    city: str = Query(None, description="Ciudad (ej. Filadelfia)"),
    zip_code: str = Query(None, description="Código Postal"),
    service: TaxService = Depends(get_tax_service)
):
    """
    Crear una nueva región fiscal.
    (Protegido: 'admin', 'finance_manager')
    """
    try:
        return await service.create_region(name, country, state, city, zip_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/regions/{region_id}", response_model=Region,
            dependencies=[Depends(is_finance_manager)]) # RBAC
async def update_region(
    region_id: str = Path(..., description="ID de la región a actualizar"),
    updates: RegionUpdate = Body(...),
    service: TaxService = Depends(get_tax_service)
):
    """
    Actualizar una región fiscal.
    (Protegido: 'admin', 'finance_manager')
    """
    try:
        # .model_dump(exclude_unset=True) envía solo los campos que llegaron
        updated_region = await service.update_region(region_id, updates.model_dump(exclude_unset=True))
        if not updated_region:
            raise HTTPException(status_code=404, detail="Región no encontrada.")
        return updated_region
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/regions/{region_id}", response_model=Dict[str, str],
              dependencies=[Depends(is_finance_manager)]) # RBAC
async def delete_region(
    region_id: str = Path(..., description="ID de la región a desactivar"),
    service: TaxService = Depends(get_tax_service)
):
    """
    Desactiva (soft delete) una región y todas sus tasas asociadas.
    (Protegido: 'admin', 'finance_manager')
    """
    try:
        return await service.delete_region(region_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# --- Endpoints de Tasas de Impuesto (Protegidos) ---

@router.get("/regions/{region_id}/tax-rates", response_model=List[TaxRate],
            dependencies=[Depends(is_finance_manager)]) # RBAC
async def get_tax_rates_for_region(
    region_id: str,
    service: TaxService = Depends(get_tax_service)
):
    """
    Obtener todas las tasas de impuesto activas para una región específica
    (ej. 6% Estatal y 2% Condado).
    (Protegido: 'admin', 'finance_manager')
    """
    return await service.get_tax_rates_for_region(region_id)

@router.post("/tax-rates", response_model=TaxRate, status_code=201,
             dependencies=[Depends(is_finance_manager)]) # RBAC
async def create_tax_rate(
    name: str = Query(..., description="Nombre de la tasa (ej. Impuesto Estatal PA)"),
    region_id: str = Query(..., description="ID de la Región a la que pertenece"),
    # Tasa debe ser decimal, ej 0.06
    rate: float = Query(..., description="Tasa como decimal (ej: 0.06 para 6%)", ge=0, lt=1),
    priority: int = Query(1, description="Orden de cálculo (1 primero)"),
    service: TaxService = Depends(get_tax_service)
):
    """
    Crear una nueva tasa de impuesto (ej. 6% Estatal) y vincularla a una región.
    (Protegido: 'admin', 'finance_manager')
    """
    try:
        return await service.create_tax_rate(name, region_id, Decimal(str(rate)), priority)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/tax-rates/{tax_rate_id}", response_model=TaxRate,
            dependencies=[Depends(is_finance_manager)]) # RBAC
async def update_tax_rate(
    tax_rate_id: str = Path(..., description="ID de la tasa a actualizar"),
    updates: TaxRateUpdate = Body(...),
    service: TaxService = Depends(get_tax_service)
):
    """
    Actualizar una tasa de impuesto.
    (Protegido: 'admin', 'finance_manager')
    """
    try:
        updated_rate = await service.update_tax_rate(tax_rate_id, updates.model_dump(exclude_unset=True))
        if not updated_rate:
            raise HTTPException(status_code=404, detail="Tasa de impuesto no encontrada.")
        return updated_rate
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/tax-rates/{tax_rate_id}", response_model=Dict[str, str],
              dependencies=[Depends(is_finance_manager)]) # RBAC
async def delete_tax_rate(
    tax_rate_id: str = Path(..., description="ID de la tasa a desactivar"),
    service: TaxService = Depends(get_tax_service)
):
    """
    Desactiva (soft delete) una tasa de impuesto.
    (Protegido: 'admin', 'finance_manager')
    """
    try:
        return await service.delete_tax_rate(tax_rate_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))