from datetime import datetime, timedelta

from pydantic import BaseModel, Field

from .common import BaseEntity


class LoginRequest(BaseModel):
    """DTO para la solicitud de login."""

    username: str
    password: str
    guest_cart_id: str | None = None


class User(BaseEntity):
    """
    Usuario del sistema (Admin).
    REFACTOR: 'role' es ahora 'roles' (una lista) para RBAC.
    """

    username: str = Field(..., min_length=3, max_length=50)
    password_hash: str
    full_name: str | None = None  # Para el "Panel de Usuario"
    email: str | None = Field(None)  # Para recuperación
    role_id: str | None = Field(default=None)  # FK a roles.id
    is_active: bool = True
    is_deleted: bool = False  # Soft delete

    # Deprecated: 'roles' list (legacy support until migration complete)
    roles: list[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    """
    Modelo de Usuario para respuestas públicas (sin password_hash).
    """

    id: str
    username: str
    full_name: str | None = None
    email: str | None = None
    roles: list[str] = Field(default_factory=list)
    is_active: bool

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """
    DTO para la respuesta de login.
    REFACTOR: Devuelve el objeto User público, sin el hash.
    """

    access_token: str
    token_type: str = "bearer"
    user: UserPublic  # Usar UserPublic en lugar de User


class UserCreateRequest(BaseModel):
    """DTO para que un Admin cree un nuevo usuario"""

    username: str = Field(..., min_length=3, max_length=50)
    plain_password: str = Field(..., min_length=8)
    full_name: str | None = None
    email: str | None = None
    roles: list[str] = Field(default_factory=list, description="Ej: ['sales', 'products']")
    is_active: bool = True


class UserUpdateRequest(BaseModel):
    """DTO para que un Admin O un usuario actualice datos (sin contraseña)"""

    full_name: str | None = None
    email: str | None = None
    roles: list[str] | None = None  # Solo un admin puede cambiar esto
    is_active: bool | None = None  # Solo un admin puede cambiar esto


class PasswordChangeRequest(BaseModel):
    """DTO para que un usuario cambie SU PROPIA contraseña"""

    old_password: str
    new_password: str = Field(..., min_length=8)


class AdminPasswordResetRequest(BaseModel):
    """DTO para que un Admin fuerce una nueva contraseña"""

    user_id: str
    new_password: str = Field(..., min_length=8)


class PasswordResetToken(BaseEntity):
    """
    ¡NUEVO MODELO! Almacena el código de 6 dígitos (hasheado)
    para recuperación de contraseña.
    """

    user_id: str = Field(...)
    token_hash: str = Field(...)  # Hash del código de 6 dígitos
    expires_at: datetime = Field(default_factory=lambda: datetime.now() + timedelta(minutes=15))  # 15 min de expiración
    is_used: bool = False

    class Config:
        from_attributes = True


class PasswordResetRequest(BaseModel):
    """DTO para SOLICITAR un código de 6 dígitos"""

    email: str
    captcha_token: str  # Token de hCaptcha/reCAPTCHA


class PasswordResetValidate(BaseModel):
    """DTO para VALIDAR el código y cambiar la contraseña"""

    email: str
    token: str  # El código de 6 dígitos (ej: "123456")
    new_password: str = Field(..., min_length=8)
