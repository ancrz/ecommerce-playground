"""
Utilidades de autenticación
REFACTORIZADO: Implementa la lógica de RBAC (Control de Acceso Basado en Roles)
usando un decorador/dependencia (RoleChecker).
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, List
import logging

# Importar el Servicio de Usuario para la verificación del token
from ..services.user_service import UserService

logger = logging.getLogger(__name__)
security = HTTPBearer()

# --- Inyección de Dependencias de Servicio ---

def get_user_service(request: Request) -> UserService:
    """Inyector para el servicio de usuarios"""
    if not hasattr(request.app.state, "user_service") or not request.app.state.user_service:
        raise HTTPException(status_code=503, detail="Servicio de usuarios no inicializado.")
    return request.app.state.user_service

# --- Dependencia de Verificación de Token ---

def verify_token_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    service: UserService = Depends(get_user_service)
) -> Dict[str, Any]:
    """
    Dependencia de FastAPI que verifica el token.
    Llamada por get_current_user.
    """
    logger.debug(f"verify_token_dependency: Received credentials: {credentials.credentials[:10]}...") # Log first 10 chars of token
    token = credentials.credentials
    user_data = service.verify_token(token) 
    
    if not user_data:
        logger.warning("verify_token_dependency: Token inválido o expirado.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")
    
    logger.debug(f"verify_token_dependency: Token verified, user_data: {user_data}")
    return user_data

# --- Dependencia de Usuario Básico ---

async def get_current_user(
    user_data: Dict[str, Any] = Depends(verify_token_dependency)
) -> Dict[str, Any]:
    """
    Obtiene los datos del usuario actual (username, roles, etc.)
    desde el token verificado.
    """
    logger.debug(f"get_current_user: User data from token: {user_data}")
    return user_data

# --- Lógica de RBAC (Control de Acceso Basado en Roles) ---

class RoleChecker:
    """
    Clase decoradora (Dependencia de FastAPI) que verifica si el usuario
    actual tiene *alguno* de los roles permitidos.
    """
    def __init__(self, allowed_roles: List[str]):
        if "admin" not in allowed_roles:
            allowed_roles.append("admin")
        self.allowed_roles = set(allowed_roles)
        logger.debug(f"RoleChecker initialized with allowed_roles: {self.allowed_roles}")

    def __call__(self, user_data: Dict[str, Any] = Depends(get_current_user)) -> bool:
        """
        Se ejecuta cuando se llama a la dependencia.
        """
        user_roles = set(user_data.get("roles", []))
        logger.debug(f"RoleChecker: user_data: {user_data}")
        logger.debug(f"RoleChecker: user_data.get('roles'): {user_data.get('roles')}")
        logger.debug(f"RoleChecker: user_roles: {user_roles}")
        logger.debug(f"RoleChecker: allowed_roles: {self.allowed_roles}")
        
        if not self.allowed_roles.intersection(user_roles):
            logger.warning(f"Acceso denegado para {user_data.get('username')}. "
                           f"Requiere: {self.allowed_roles}, Tiene: {user_roles}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos suficientes para esta acción."
            )
        return True

    def __or__(self, other: 'RoleChecker') -> 'RoleChecker':
        """
        Permite combinar dos RoleCheckers con el operador `|`.
        Devuelve un nuevo RoleChecker con la unión de los roles.
        """
        if not isinstance(other, RoleChecker):
            return NotImplemented
        
        combined_roles = self.allowed_roles.union(other.allowed_roles)
        return RoleChecker(list(combined_roles))

# --- Inyectores de Roles Específicos ---

is_admin = RoleChecker(["admin"])
is_content_manager = RoleChecker(["content_manager"])
is_products_manager = RoleChecker(["products_manager"])
is_finance_manager = RoleChecker(["finance_manager"])
is_sales_manager = RoleChecker(["sales_manager"])
