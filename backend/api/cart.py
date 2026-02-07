"""
API Router para el Carrito de Compras
REFACTORIZADO: Expone el CartService con lógica de impuestos y seguridad.
HOMOLOGACIÓN: Endpoint /guest para inicialización de carritos anónimos.
"""

import uuid

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from pydantic import BaseModel

# Importar los DTOs (Modelos)
from ..models import Cart

# Importar los Servicios (Inyección de Dependencias)
from ..services.cart_service import CartService

# Importar el validador de token

router = APIRouter()

# --- Modelos de Request (DTOs de Entrada) ---


class AddItemRequest(BaseModel):
    """
    REFACTOR: Modelo seguro para añadir items.
    Solo acepta el ID y la cantidad, NUNCA el precio.
    """

    product_id: str
    quantity: int


class UpdateQuantityRequest(BaseModel):
    """Modelo para actualizar la cantidad de un item"""

    quantity: int


# --- Inyección de Dependencias ---


def get_cart_service(request: Request):
    """
    REFACTOR: Inyector de dependencias actualizado.
    Obtiene las instancias de servicio desde main.py (o el contexto de la app).
    """
    if not hasattr(request.app.state, "cart_service") or not request.app.state.cart_service:
        raise HTTPException(status_code=503, detail="Servicio de carrito no inicializado.")
    return request.app.state.cart_service


# --- Endpoints de la API del Carrito ---


@router.post("/guest", response_model=Cart, status_code=201)
async def create_guest_cart(
    region_id: str = Query(..., description="ID de la Región fiscal (para impuestos)"),
    currency_id: str = Query(..., description="ID de la Moneda (para visualización)"),
    service: CartService = Depends(get_cart_service),
):
    """
    HOMOLOGACIÓN: Crear un carrito para usuario invitado.
    Este endpoint centraliza la lógica que antes estaba en el frontend.
    Genera automáticamente un ID único para el invitado.
    """
    try:
        guest_id = f"guest-{uuid.uuid4().hex[:8]}"
        cart = await service.create_cart(
            customer_name="Invitado", customer_id=guest_id, region_id=region_id, currency_id=currency_id
        )
        return cart
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/", response_model=Cart, status_code=201)
async def create_cart(
    customer_name: str = Query(..., description="Nombre del cliente"),
    customer_id: str = Query(..., description="Cédula o RIF del cliente"),
    region_id: str = Query(..., description="ID de la Región fiscal (para impuestos)"),
    currency_id: str = Query(..., description="ID de la Moneda (para visualización)"),
    service: CartService = Depends(get_cart_service),
):
    """
    Crear un nuevo carrito de compras con datos de cliente específicos.
    REFACTOR: Ahora requiere region_id y currency_id.
    """
    try:
        cart = await service.create_cart(customer_name, customer_id, region_id, currency_id)
        return cart
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{cart_id}", response_model=Cart)
async def get_cart(cart_id: str, service: CartService = Depends(get_cart_service)):
    """
    Obtener el estado completo de un carrito, incluyendo totales e impuestos.
    """
    cart = await service.get_cart(cart_id)
    if not cart:
        raise HTTPException(status_code=404, detail="Carrito no encontrado")
    return cart


@router.get("/", response_model=list[Cart])
async def get_pending_carts(
    skip: int = Query(0, description="Registros a saltar"),
    limit: int = Query(20, description="Límite de resultados"),
    service: CartService = Depends(get_cart_service),
    # NOTA: Este endpoint es para el Admin, debería estar protegido
    # current_user: dict = Depends(get_current_user)
):
    """
    Obtener la lista de carritos pendientes de pago (para la cola del admin).
    """
    return await service.get_pending_carts(skip=skip, limit=limit)


@router.post("/{cart_id}/items", response_model=Cart)
async def add_item_to_cart(
    cart_id: str,
    item_request: AddItemRequest = Body(...),  # REFACTOR: Modelo seguro
    service: CartService = Depends(get_cart_service),
):
    """
    Agregar un item al carrito.
    REFACTOR: Ya no acepta un precio desde el frontend.
    El precio se obtiene desde el ProductService en el backend.
    """
    try:
        cart = await service.add_item(
            cart_id=cart_id, product_id=item_request.product_id, quantity=item_request.quantity
        )
        return cart
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("/{cart_id}/items/{product_id}", response_model=Cart)
async def update_item_quantity(
    cart_id: str,
    product_id: str,
    request: UpdateQuantityRequest = Body(...),
    service: CartService = Depends(get_cart_service),
):
    """
    ¡NUEVO ENDPOINT!
    Actualizar la cantidad de un item en el carrito.
    """
    try:
        cart = await service.update_item_quantity(cart_id=cart_id, product_id=product_id, new_quantity=request.quantity)
        return cart
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/{cart_id}/items/{product_id}", response_model=Cart)
async def remove_item_from_cart(cart_id: str, product_id: str, service: CartService = Depends(get_cart_service)):
    """
    ¡NUEVO ENDPOINT!
    Eliminar un item del carrito.
    """
    try:
        cart = await service.remove_item(cart_id, product_id)
        return cart
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{cart_id}/qr", response_model=dict[str, str])
async def generate_qr(cart_id: str, service: CartService = Depends(get_cart_service)):
    """
    Generar un código QR para un carrito.
    El QR ahora contiene el total CON impuestos.
    """
    try:
        qr_code_data_uri = await service.generate_qr(cart_id)
        return {"qr_code": qr_code_data_uri}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
