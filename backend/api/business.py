"""
API Router para la Información del Negocio
REFACTORIZADO: Esta es una capa de API "delgada".
Toda la lógica de negocio y DB ha sido movida al BusinessService.
"""

import logging

from fastapi import APIRouter, Body, Depends, File, HTTPException, Request, UploadFile

# Importar los DTOs
from ..models import BusinessInfo

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
async def get_business_info(service: BusinessService = Depends(get_business_service)):
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
        raise HTTPException(status_code=500, detail="Error interno al obtener información del negocio.") from e


@router.put("/info", response_model=BusinessInfo)
async def update_business_info(
    info_updates: BusinessInfoUpdate = Body(...),  # REFACTOR: Usa el DTO de Actualización
    current_user: dict = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service),
):
    """
    Actualizar la información del negocio (nombre, rif, contacto, redes).
    Nota: Las imágenes (logo, icon) se actualizan vía 'api/images.py'.
    """
    try:
        # Pasa solo los campos que el frontend envió al servicio
        return await service.update_business_info(info_updates)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error al actualizar información del negocio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno al actualizar información.") from e


@router.post("/social-icon/{network_index}", response_model=BusinessInfo)
async def upload_social_icon(
    network_index: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service),
):
    """
    Sube un icono para una red social específica.
    """
    try:
        file_data = await file.read()
        return await service.upload_social_network_icon(network_index, file_data, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error al subir icono de red social: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error procesando imagen.") from e


# --- Nuevo Endpoint: Previsualización de Factura ---


@router.post("/preview-invoice")
async def preview_invoice_pdf(
    info_updates: BusinessInfoUpdate = Body(...),
    current_user: dict = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service),
    request: Request = None,
):
    """
    Genera un PDF de prueba con los datos fiscales enviados (sin guardarlos).
    Útil para previsualizar cómo quedará la factura antes de guardar cambios.
    """
    try:
        # 1. Recuperar el InvoiceService (que no está inyectado directamente aquí, pero está en app.state)
        # Podríamos inyectarlo, pero para no romper firmas, lo sacamos de request.app.state
        if not hasattr(request.app.state, "invoice_service"):
            raise HTTPException(status_code=503, detail="InvoiceService no disponible")
        invoice_service = request.app.state.invoice_service

        # 2. Construir objeto BusinessInfo temporal mezclando lo actual con los updates
        current_info = await service.get_business_info()

        # update de pydantic (mocking param dict)
        update_data = info_updates.model_dump(exclude_unset=True)

        # Crear copia modificada
        temp_info = current_info.model_copy(update=update_data)

        # 3. Generar Preview
        pdf_bytes = await invoice_service.generate_preview(custom_business_info=temp_info)

        # 4. Retornar Blob
        from fastapi.responses import Response

        return Response(content=pdf_bytes, media_type="application/pdf")

    except Exception as e:
        logger.error(f"Error generando preview de factura: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generando preview: {e}") from e
