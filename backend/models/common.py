import uuid
from datetime import datetime

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

    def update_timestamp(self):
        """Actualizar timestamp de modificación"""
        self.updated_at = datetime.now()
