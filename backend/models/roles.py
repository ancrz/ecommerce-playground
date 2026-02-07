from pydantic import BaseModel, Field

from .common import BaseEntity


class Role(BaseEntity):
    """
    Modelo de Rol (RBAC Dinámico).
    """

    name: str = Field(..., unique=True, min_length=3, max_length=50)
    description: str | None = None
    permissions: dict[str, int] = Field(
        default_factory=dict, description="Mapa de {modulo: nivel_acceso}. Ej: {'sales': 7}"
    )
    is_system: bool = Field(default=False, description="Si es True, no se puede borrar ni editar nombre.")
    is_active: bool = True
    is_deleted: bool = False

    class Config:
        from_attributes = True


class RoleCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    description: str | None = None
    permissions: dict[str, int] = Field(default_factory=dict)


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permissions: dict[str, int] | None = None
    is_active: bool | None = None
