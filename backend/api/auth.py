"""
API Router para Autenticación, Autogestión y Panel de Usuario
REFACTORIZADO: Expone el UserService (RBAC + Autogestión).
"""

import logging
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# Importar Modelos DTO
from ..models import (
    LoginRequest,  # Add UserPublic here
    PasswordChangeRequest,
    PasswordResetRequest,
    PasswordResetValidate,
    TokenResponse,
    User,
    UserPublic,
    UserUpdateRequest,
)

# Importar el Servicio
from ..services.user_service import UserService

# Importar los guardianes de usuario y roles
from ..utils.auth import get_current_user, get_user_service

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

# --- Endpoints Públicos (Login/Logout) ---


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest = Body(...), service: UserService = Depends(get_user_service)):
    """
    Login de usuario.
    """
    user = await service.authenticate_user(request.username, request.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas o usuario inactivo"
        )

    token = service.create_token(user)

    # Explicitly convert User to UserPublic for the response
    # Use model_dump with exclude to remove password_hash
    user_public = UserPublic.model_validate(user).model_dump(exclude={"password_hash"})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_public,  # Pass the UserPublic instance
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security), service: UserService = Depends(get_user_service)
):
    """
    Logout de usuario (revoca el token en memoria).
    """
    token = credentials.credentials
    if not service.revoke_token(token):
        pass
    return None


# --- Endpoints de Autogestión (Recuperación de Clave) ---


@router.post("/request-password-reset", status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(
    request: PasswordResetRequest = Body(...), service: UserService = Depends(get_user_service)
):
    """
    Paso 1 (Público): Solicitar un código de 6 dígitos.
    """
    try:
        await service.request_password_reset(request.email, request.captcha_token)
        return {"message": "Si existe una cuenta con este email, se enviará un código."}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error en request_password_reset: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al procesar la solicitud de reseteo.")


@router.post("/validate-password-reset", response_model=dict[str, str])
async def validate_password_reset(
    request: PasswordResetValidate = Body(...), service: UserService = Depends(get_user_service)
):
    """
    Paso 2 (Público): Validar el código de 6 dígitos y establecer la nueva contraseña.
    """
    try:
        result = await service.reset_password(request.email, request.token, request.new_password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error en validate_password_reset: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al resetear la contraseña.")


# --- Endpoints de "Panel de Usuario" (Autogestión, Protegido) ---


@router.get("/me", response_model=User)
async def get_me(
    current_user: dict[str, Any] = Depends(get_current_user),
    service: UserService = Depends(get_user_service),  # Inject UserService
):
    """
    Obtiene los datos del usuario actualmente logueado.
    """
    user_id = current_user.get("sub")  # 'sub' claim holds the user ID
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido: ID de usuario no encontrado."
        )

    user = await service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    return user


@router.put("/me", response_model=User)
async def update_me(
    updates: UserUpdateRequest = Body(...),
    current_user: dict[str, Any] = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
):
    """
    Actualiza el perfil del usuario logueado (full_name, email).
    """
    user_id = current_user.get("id")

    if updates.roles is not None or updates.is_active is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="No puede cambiar sus propios roles o estado de activación."
        )

    try:
        updated_user = await service.update_user_profile(user_id, updates)
        return updated_user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/me/password", response_model=dict[str, str])
async def change_my_password(
    request: PasswordChangeRequest = Body(...),
    current_user: dict[str, Any] = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
):
    """
    Permite al usuario logueado cambiar su propia contraseña.
    """
    user_id = current_user.get("id")
    try:
        await service.change_password(user_id, request.old_password, request.new_password)
        return {"message": "Contraseña cambiada exitosamente."}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
