"""
================================================================================
ECOMMERCE PLAYGROUND - API de Personalización
================================================================================
"""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from ..models import Customization
from ..services.customization_service import CustomizationService, CustomizationUpdate
from ..utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


def get_customization_service(request: Request) -> CustomizationService:
    """Inyector para el servicio de personalización"""
    if not hasattr(request.app.state, "customization_service") or not request.app.state.customization_service:
        raise HTTPException(status_code=503, detail="Servicio de personalización no inicializado.")
    return request.app.state.customization_service


@router.get("/", response_model=Customization)
async def get_customization(service: CustomizationService = Depends(get_customization_service)):
    """Obtener configuración de personalización"""
    return await service.get_customization()


@router.put("/", response_model=Customization)
async def update_customization(
    updates: CustomizationUpdate,
    current_user: dict = Depends(get_current_user),
    service: CustomizationService = Depends(get_customization_service),
):
    """Actualizar personalización (campos de texto)"""
    try:
        return await service.update_customization(updates)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error al actualizar customization: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al actualizar la base de datos: {e}"
        ) from e


@router.post("/icon/{module_name}", response_model=Customization)
async def upload_module_icon(
    module_name: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    service: CustomizationService = Depends(get_customization_service),
):
    """
    Subir, formatear y reducir un icono para un módulo del admin.
    """
    try:
        file_data = await file.read()
        return await service.upload_module_icon(module_name, file_data, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error procesando imagen: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error procesando imagen: {e}") from e
