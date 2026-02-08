import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from ..models.customers import Customer
from .deps import get_current_user, is_admin

logger = logging.getLogger(__name__)

router = APIRouter()


class SMTPConfig(BaseModel):
    host: str
    port: int
    user: str
    password: str
    from_email: str
    enabled: bool


@router.get("/preview", dependencies=[Depends(is_admin)])
async def get_invoice_preview(request: Request):
    """
    Genera una vista previa del PDF de la factura.
    Retorna el archivo PDF directamente.
    """
    if not hasattr(request.app.state, "invoice_service"):
        raise HTTPException(status_code=503, detail="Invoice Service Unavailable")

    try:
        pdf_bytes = request.app.state.invoice_service.generate_preview()
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        logger.error(f"Error generating preview: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/smtp/test", dependencies=[Depends(is_admin)])
async def test_smtp_connection(request: Request):
    """
    Prueba la conexión SMTP (Circuit Breaker Check).
    """
    if not hasattr(request.app.state, "email_service"):
        raise HTTPException(status_code=503, detail="Email Service Unavailable")

    result = await request.app.state.email_service.verify_connection()
    if result:
        return {"status": "success", "message": "Conexión SMTP exitosa"}
    else:
        return {"status": "failed", "message": "Fallo la conexión SMTP"}


@router.get("/customers/cedula/{cedula}")
async def get_customer_by_cedula(cedula: str, request: Request, user=Depends(get_current_user)):
    """
    Busca un cliente por su Cédula/RIF.
    Usado en Checkout para auto-completado.
    """
    try:
        db = request.app.state.user_service.db_manager
        query = "SELECT * FROM customers WHERE cedula = ?"
        row = await db.fetchone("customers", query, (cedula,))

        if row:
            return Customer.model_validate(row)
        else:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

    except Exception as e:
        logger.error(f"Error fetching customer {cedula}: {e}")
        # Si es 404, re-raise, si no 500
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Error de servidor") from e
