from fastapi import HTTPException, Request, status

from ..database.manager import DatabaseManager
from ..services.cart_service import CartService
from ..services.product_service import ProductService
from ..services.sales_service import SalesService
from ..services.user_service import UserService


def get_db_manager(request: Request) -> DatabaseManager:
    """Inyector para el DatabaseManager."""
    if not hasattr(request.app.state, "db_manager") or not request.app.state.db_manager:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="DatabaseManager no inicializado.")
    return request.app.state.db_manager


def get_cart_service(request: Request) -> CartService:
    """Inyector para el CartService."""
    if not hasattr(request.app.state, "cart_service") or not request.app.state.cart_service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="CartService no inicializado.")
    return request.app.state.cart_service


def get_product_service(request: Request) -> ProductService:
    """Inyector para el ProductService."""
    if not hasattr(request.app.state, "product_service") or not request.app.state.product_service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="ProductService no inicializado.")
    return request.app.state.product_service


def get_user_service(request: Request) -> UserService:
    """Inyector para el UserService (ya existe en auth.py, pero se centraliza aquí)."""
    if not hasattr(request.app.state, "user_service") or not request.app.state.user_service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="UserService no inicializado.")
    return request.app.state.user_service


def get_sales_service(request: Request) -> SalesService:
    """Inyector para el SalesService."""
    if not hasattr(request.app.state, "sales_service") or not request.app.state.sales_service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SalesService no inicializado.")
    return request.app.state.sales_service
