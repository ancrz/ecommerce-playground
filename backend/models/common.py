import os
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

# URL base para generar URLs completas de imágenes
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8042")


class BaseEntity(BaseModel):
    """Entidad base con funcionalidades comunes"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True  # Permite cargar desde objetos de BD
        json_encoders = {datetime: lambda v: v.isoformat() + "Z", Decimal: lambda v: float(v)}

    def update_timestamp(self):
        """Actualizar timestamp de modificación"""
        self.updated_at = datetime.now()
