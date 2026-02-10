import uuid
from datetime import datetime

from pydantic import field_serializer
from sqlmodel import Field, SQLModel

from ..core.config import settings

# URL base para generar URLs completas de imágenes
BACKEND_URL = settings.BACKEND_URL


class BaseEntity(SQLModel):
    """Entidad base con funcionalidades comunes (SQLModel)"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    model_config = {"from_attributes": True}

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, dt: datetime, _info):
        # Formato ISO 8601 estricto con "Z" suffix para compatibilidad con Zod z.string().datetime()
        # timespec="seconds" elimina microsegundos que Zod no acepta por defecto
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    def update_timestamp(self):
        """Actualizar timestamp de modificación"""
        self.updated_at = datetime.now()
