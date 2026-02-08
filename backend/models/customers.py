from datetime import datetime

from pydantic import BaseModel, Field

from .common import BaseEntity


class Customer(BaseEntity):
    """
    Identidad Transaccional del Cliente.
    Usada para Billing/Compliance.
    """

    # La cédula/RIF es el identificador único fiscal
    cedula: str = Field(..., description="Documento de Identidad Fiscal (PK)")
    name: str = Field(..., description="Razón Social o Nombre Completo")
    address: str | None = Field(None, description="Dirección Fiscal")
    phone: str | None = Field(None, description="Teléfono de contacto")
    email: str | None = Field(None, description="Correo para envío de factura")

    # Metadatos de auditoría
    last_purchase: datetime | None = None

    class Config:
        from_attributes = True


class CustomerCreate(BaseModel):
    """DTO para crear/actualizar un cliente en el checkout."""

    cedula: str = Field(..., min_length=5)
    name: str = Field(..., min_length=3)
    address: str | None = None
    phone: str | None = None
    email: str | None = None
