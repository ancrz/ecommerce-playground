from datetime import datetime

from pydantic import BaseModel
from sqlmodel import Field

from .common import BaseEntity


class Customer(BaseEntity, table=True):
    """
    Identidad Transaccional del Cliente.
    Usada para Billing/Compliance.
    """

    __tablename__ = "customers"

    # La cédula/RIF es el identificador único fiscal
    cedula: str = Field(..., description="Documento de Identidad Fiscal", unique=True, index=True)
    name: str = Field(..., description="Razón Social o Nombre Completo", index=True)
    address: str | None = Field(default=None, description="Dirección Fiscal")
    phone: str | None = Field(default=None, description="Teléfono de contacto")
    email: str | None = Field(default=None, description="Correo para envío de factura", index=True)

    # Metadatos de auditoría
    last_purchase: datetime | None = None

    model_config = {"from_attributes": True}


class CustomerCreate(BaseModel):
    """DTO para crear/actualizar un cliente en el checkout."""

    cedula: str = Field(..., min_length=5)
    name: str = Field(..., min_length=3)
    address: str | None = None
    phone: str | None = None
    email: str | None = None
