"""
¡NUEVO ARCHIVO API!
API Router para la Administración de Usuarios (RBAC).
Estos endpoints son SOLO para usuarios con el rol 'admin'.
"""

from fastapi import APIRouter, HTTPException, Depends, Body, status, Request
from typing import List, Dict, Any

import logging

# Importar Modelos DTO
from ..models.base import (
    User, 
    UserCreateRequest, 
    UserUpdateRequest, 
    AdminPasswordResetRequest
)
# Importar el Servicio
from ..services.user_service import UserService
# REFACTOR: Importar el guardián de rol "admin"
from ..utils.auth import is_admin # Keep import for clarity, but not used directly in endpoint dependencies

logger = logging.getLogger(__name__) # Initialize logger

router = APIRouter()

# --- Inyección de Dependencias ---

def get_user_service(request: Request) -> UserService:
    """Inyector para el servicio de usuarios"""
    if not hasattr(request.app.state, "user_service") or not request.app.state.user_service:
        raise HTTPException(status_code=503, detail="Servicio de usuarios no inicializado.")
    return request.app.state.user_service

# --- Endpoints de Administración de Usuarios (Protegidos por Rol "admin") ---

@router.get(
    "/", 
    response_model=List[User]
)
async def get_all_users(
    service: UserService = Depends(get_user_service)
):
    """
    Obtiene una lista de todos los usuarios en el sistema.
    (Solo para 'admin')
    """
    logger.debug("Attempting to get all users (user_admin.router).")
    # Esta función (get_all_users) debe ser añadida al UserService
    users = await service.get_all_users()
    return users

@router.post(
    "/users", 
    response_model=User, 
    status_code=status.HTTP_201_CREATED
)
async def create_new_user(
    request: UserCreateRequest = Body(...),
    service: UserService = Depends(get_user_service)
):
    """
    Crea un nuevo usuario (empleado) en el sistema.
    (Solo para 'admin')
    """
    try:
        user = await service.create_user(request)
        return user
    except ValueError as e:
        # Error (ej. "username ya existe", "email ya existe")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error al crear usuario: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno al crear usuario.")

@router.get(
    "/users/{user_id}", 
    response_model=User
)
async def get_user_by_id(
    user_id: str,
    service: UserService = Depends(get_user_service)
):
    """
    Obtiene los detalles de un usuario específico por ID.
    (Solo para 'admin')
    """
    user = await service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user

@router.put(
    "/users/{user_id}", 
    response_model=User
)
async def update_user(
    user_id: str,
    updates: UserUpdateRequest = Body(...),
    service: UserService = Depends(get_user_service)
):
    """
    Actualiza el perfil de un usuario (roles, estado, nombre, email).
    (Solo para 'admin')
    """
    try:
        updated_user = await service.admin_update_user(user_id, updates)
        return updated_user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post(
    "/reset-password", 
    response_model=Dict[str, str]
)
async def admin_reset_password(
    request: AdminPasswordResetRequest = Body(...),
    service: UserService = Depends(get_user_service)
):
    """
    Permite a un admin forzar una nueva contraseña para cualquier usuario.
    (Solo para 'admin')
    """
    try:
        await service.admin_reset_password(request.user_id, request.new_password)
        return {"message": "Contraseña del usuario reseteada exitosamente."}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))