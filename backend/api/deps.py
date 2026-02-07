"""
Módulo de Dependencias de API.
Consolida la lógica de autenticación (JIT), RBAC y acceso a servicios.
Sustituye a 'utils/auth.py' progresivamente.
"""

import logging
from typing import cast

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# Import models directly to avoid circular dependencies if possible,
# or use TYPE_CHECKING
# Import models directly to avoid circular dependencies if possible,
# or use TYPE_CHECKING
from ..models.users import User
from ..services.user_service import UserService

logger = logging.getLogger(__name__)
security = HTTPBearer()

# ==============================================================================
# 1. SERVICE INJECTION
# ==============================================================================


def get_user_service(request: Request) -> UserService:
    """Inyector para el servicio de usuarios."""
    if not hasattr(request.app.state, "user_service") or not request.app.state.user_service:
        raise HTTPException(status_code=503, detail="Servicio de usuarios no disponible.")
    return cast(UserService, request.app.state.user_service)


# ==============================================================================
# 2. AUTHENTICATION & JIT
# ==============================================================================


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), service: UserService = Depends(get_user_service)
) -> User:
    """
    Valida el token y devuelve el usuario autenticado.
    Nota: La lógica JIT completa (creation on fly) reside en el login del service,
    aquí validamos la sesión actual.
    """
    token = credentials.credentials
    # UserService.verify_token returns a dict or User object?
    # Based on utils/auth.py analysis, it returned a dict.
    # We want to standardize on returning the User model if possible,
    # but for now let's respect the existing service contract.

    user_data = service.verify_token(token)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Convert dict to User model to standardize the dependency return type
    # Handle explicit 'id' vs 'sub' mismatch if necessary
    try:
        # Assuming user_data is a dict consistent with User model
        # If 'roles' is a list, make sure it's handled.
        return User(**user_data)
    except Exception as e:
        logger.error(f"Error converting user payload to Model: {e}")
        # Fallback: return user_data as is if it creates issues,
        # but type hint says User.
        # For safety in this transition, let's reconstruct a minimal User
        from datetime import datetime

        return User(
            id=str(user_data.get("id", "")),  # Force string
            username=str(user_data.get("username", "unknown")),
            email=str(user_data.get("email", "unknown")),
            roles=list(user_data.get("roles", [])),
            is_active=True,
            password_hash="***",
            created_at=datetime.utcnow(),  # Provide valid dummy datetime
            updated_at=datetime.utcnow(),
        )


# ==============================================================================
# 3. RBAC (Dynamic Role Based Access Control)
# ==============================================================================


class PermissionChecker:
    """
    Verifica si el rol del usuario tiene los permisos (Unix-style) requeridos
    para un módulo específico.
    """

    def __init__(self, module: str, level: int):
        self.module = module
        self.level = level  # 4=Read, 2=Write, 1=Execute

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        # 1. Superuser bypass
        # if user.is_superuser: return user

        # 2. Check for Soft Delete (redundant if get_current_user checks it, but safe)
        if user.is_deleted:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta inactiva o eliminada.")

        # 3. Resolve Role
        # En una implementación real con DB, haríamos join.
        # Aquí asumimos que user.roles (legacy list) o user.role_id nos da la info.
        # Por ahora, mantengamos compatibilidad con la lista 'roles' legacy
        # MIENTRAS migramos a la lógica de Role model completa.

        # TODO: Cargar el Role completo desde DB usando user.role_id
        # Por simplicidad en este paso, usaremos la lógica legacy de nombre de rol
        # mapeada a permisos HC (Hardcoded) temporalmente o
        # idealmente, obtenemos el Role object.

        # Estrategia Híbrida Temporal:
        # Si el usuario es "admin" (legacy role string), tiene acceso total.
        if "admin" in user.roles:
            return user

        # Si no, denegar por defecto hasta que integremos queries de Role.
        # (Esto fuerza a usar admin para probar o implementar el RoleService.get_by_id)

        # Mockup de permisos para "seller" (si existe en legacy roles)
        if "seller" in user.roles:
            # Seller tiene Sales:7, Products:4
            user_perms = {"sales": 7, "products": 4}
            role_perm = user_perms.get(self.module, 0)
            if role_perm & self.level == self.level:
                return user

        logger.warning(f"⛔ Acceso denegado. User: {user.username}, Module: {self.module}, Req Level: {self.level}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos suficientes.")


# Pre-defined checkers (Aliases)
# Examples:
# require_sales_read = PermissionChecker("sales", settings.PERM_READ)
# require_sales_write = PermissionChecker("sales", settings.PERM_WRITE)


async def is_admin(user: User = Depends(get_current_user)) -> User:
    """
    Dependencia simple para verificar si el usuario es administrador.
    Por ahora, verifica si el rol 'admin' está en la lista de roles.
    """
    if "admin" not in user.roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requieren privilegios de administrador.")
    return user
