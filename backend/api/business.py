"""
API Router para la Información del Negocio
REFACTORIZADO: Esta es una capa de API "delgada".
Toda la lógica de negocio y DB ha sido movida al BusinessService.
"""

from fastapi import APIRouter, HTTPException, Depends, Body, Request, File, UploadFile
import logging

# Importar los DTOs
from ..models.base import BusinessInfo
# Importar el DTO de Actualización que definimos en el servicio
from ..services.business_service import BusinessInfoUpdate, BusinessService
from ..utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Inyección de Dependencias ---

def get_business_service(request: Request):
    """
    REFACTOR: Inyector de dependencias.
    Obtiene la instancia global del BusinessService desde main.py.
    """
    if not hasattr(request.app.state, "business_service") or not request.app.state.business_service:
        logger.error("Servicio de negocio no inicializado.")
        raise HTTPException(status_code=503, detail="Servicio de negocio no inicializado.")
    return request.app.state.business_service

# --- Endpoints de la API de Negocio ---

@router.get("/info", response_model=BusinessInfo)
async def get_business_info(
    service: BusinessService = Depends(get_business_service)
):
    """
    Obtener la información pública del negocio
    (nombre, rif, contacto, redes, logo_url, icon_url).
    """
    try:
        info = await service.get_business_info()
        logger.info(f"Business info data being sent to frontend: {info.model_dump()}")
        return info
    except Exception as e:
        logger.error(f"Error al obtener información del negocio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno al obtener información del negocio.")


@router.put("/info", response_model=BusinessInfo)
async def update_business_info(
    info_updates: BusinessInfoUpdate = Body(...), # REFACTOR: Usa el DTO de Actualización
    current_user: dict = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service)
):
    """
    Actualizar la información del negocio (nombre, rif, contacto, redes).
    Nota: Las imágenes (logo, icon) se actualizan vía 'api/images.py'.
    """
    try:
        # Pasa solo los campos que el frontend envió al servicio
        return await service.update_business_info(info_updates)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error al actualizar información del negocio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno al actualizar información.")

@router.post("/social-icon/{network_index}", response_model=BusinessInfo)
async def upload_social_icon(
    network_index: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service)
):
    """
    Sube un icono para una red social específica.
    """
    try:
        file_data = await file.read()
        return await service.upload_social_network_icon(network_index, file_data, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error al subir icono de red social: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error procesando imagen.")