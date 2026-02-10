"""
Servicio de Carrito de Compras
REFACTORIZADO: Este servicio ahora es el punto de integración.
Consume ProductService (para precios) y TaxService (para impuestos).
"""

import base64
import json
import logging
from datetime import datetime
from decimal import Decimal
from io import BytesIO

import qrcode

# Importar el gestor de DB
from ..database.manager import DatabaseManager

# Importar los modelos DTO de base.py
from ..models import Cart, CartItem

# --- INICIO DE LA MEJRA (Inyección de Dependencias) ---
# Importar los *otros servicios* que este servicio necesita
from .product_service import ProductService
from .tax_service import TaxService

# --- FIN DE LA MEJORA ---

logger = logging.getLogger(__name__)


class CartService:
    """Servicio para la lógica de negocio del carrito de compras"""

    def __init__(
        self,
        db_manager: DatabaseManager,
        product_service: ProductService,  # Inyección de dependencia
        tax_service: TaxService,  # Inyección de dependencia
    ):
        self.db_manager = db_manager
        # Servicios dependientes
        self.product_service = product_service
        self.tax_service = tax_service
        logger.info("CartService inicializado (con dependencias de ProductService y TaxService)")

    async def create_cart(
        self,
        customer_name: str,
        customer_id: str,
        region_id: str,  # REFACTOR: El carrito DEBE tener una región fiscal
        currency_id: str,  # REFACTOR: El carrito DEBE tener una moneda de visualización
    ) -> Cart:
        """Crear nuevo carrito en la base de datos"""

        # Validar que los IDs existen (opcional pero recomendado)
        # await self.tax_service.get_region(region_id)
        # await self.finance_service.get_currency(currency_id)

        cart = Cart(customer_name=customer_name, customer_id=customer_id, region_id=region_id, currency_id=currency_id)

        try:
            # REFACTOR: Se guardan los nuevos campos (region_id, currency_id)
            await self.db_manager.execute(
                "cart",
                """
                INSERT INTO carts (
                    id, customer_name, customer_id, items, status,
                    region_id, currency_id,
                    subtotal, tax_amount, igtf_amount, total_with_tax,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    cart.id,
                    cart.customer_name,
                    cart.customer_id,
                    "[]",  # Empty items JSON array
                    cart.status,
                    cart.region_id,
                    cart.currency_id,
                    0,
                    0,
                    0,
                    0,  # Totales iniciales
                    cart.created_at.isoformat(),
                    cart.updated_at.isoformat(),
                ),
            )
            logger.info(f"Carrito {cart.id} creado para {customer_name} en región {region_id}")
            return cart
        except Exception as e:
            logger.error(f"Error al crear carrito: {e}", exc_info=True)
            raise ValueError(f"Error al crear carrito: {str(e)}") from e

    async def get_cart(self, cart_id: str) -> Cart | None:
        """
        Obtiene el carrito con sus items (almacenados como JSON en la columna 'items').
        """
        cart_row = await self.db_manager.fetchone("cart", "SELECT * FROM carts WHERE id = ?", (cart_id,))
        if not cart_row:
            return None

        # SQLite devuelve 'items' como string JSON; parsearlo antes de model_validate
        row_data = dict(cart_row)
        if isinstance(row_data.get("items"), str):
            row_data["items"] = json.loads(row_data["items"])

        cart = Cart.model_validate(row_data)
        return cart

    async def add_item(self, cart_id: str, product_id: str, quantity: int) -> Cart:
        """
        Añade un item al carrito.
        Items se almacenan como JSON en la columna 'items' de la tabla 'carts'.
        """
        if quantity <= 0:
            raise ValueError("La cantidad debe ser positiva.")

        # 1. Obtener el producto y su PRECIO REAL desde el ProductService
        product = await self.product_service.get_product(product_id)
        if not product:
            raise ValueError(f"Producto {product_id} no encontrado.")

        if product.stock < quantity:
            raise ValueError(f"Stock insuficiente para {product.name} (Stock: {product.stock})")

        # 2. Leer items actuales del carrito (JSON)
        cart = await self.get_cart(cart_id)
        if not cart:
            raise ValueError("Carrito no encontrado.")

        items = list(cart.items)
        item_price = product.final_price
        item_name = product.name

        # 3. Buscar si el producto ya existe en el carrito
        existing_idx = next((i for i, item in enumerate(items) if item.product_id == product_id), None)

        if existing_idx is not None:
            new_quantity = items[existing_idx].quantity + quantity
            if product.stock < new_quantity:
                raise ValueError(
                    f"Stock insuficiente para {product.name} (Solicitado: {new_quantity}, Stock: {product.stock})"
                )
            items[existing_idx].quantity = new_quantity
            items[existing_idx].price = Decimal(str(item_price))
        else:
            items.append(
                CartItem(
                    product_id=product_id,
                    product_name=item_name,
                    quantity=quantity,
                    price=Decimal(str(item_price)),
                )
            )

        # 4. Guardar items actualizados y recalcular totales
        await self._save_items_and_recalculate(cart_id, items)
        return await self.get_cart(cart_id)  # type: ignore[return-value]

    async def remove_item(self, cart_id: str, product_id: str) -> Cart:
        """Elimina un item del carrito (JSON items)"""
        cart = await self.get_cart(cart_id)
        if not cart:
            raise ValueError("Carrito no encontrado.")

        items = [item for item in cart.items if item.product_id != product_id]
        await self._save_items_and_recalculate(cart_id, items)
        return await self.get_cart(cart_id)  # type: ignore[return-value]

    async def update_item_quantity(self, cart_id: str, product_id: str, new_quantity: int) -> Cart:
        """Actualiza la cantidad de un item (JSON items)"""
        if new_quantity <= 0:
            return await self.remove_item(cart_id, product_id)

        product = await self.product_service.get_product(product_id)
        if not product:
            raise ValueError(f"Producto {product_id} no encontrado.")
        if product.stock < new_quantity:
            raise ValueError(f"Stock insuficiente para {product.name} (Stock: {product.stock})")

        cart = await self.get_cart(cart_id)
        if not cart:
            raise ValueError("Carrito no encontrado.")

        items = list(cart.items)
        for item in items:
            if item.product_id == product_id:
                item.quantity = new_quantity
                break

        await self._save_items_and_recalculate(cart_id, items)
        return await self.get_cart(cart_id)  # type: ignore[return-value]

    async def _save_items_and_recalculate(self, cart_id: str, items: list[CartItem]) -> None:
        """
        Guarda los items como JSON y recalcula totales (subtotal + impuestos).
        Fuente única de verdad para la persistencia de items.
        """
        # 1. Obtener región y moneda del carrito
        cart_row = await self.db_manager.fetchone("cart", "SELECT region_id, currency_id FROM carts WHERE id = ?", (cart_id,))
        if not cart_row:
            raise ValueError("Carrito no encontrado durante el recálculo.")
        region_id = cart_row["region_id"]
        currency_id = cart_row["currency_id"]

        # 2. Calcular subtotal desde los items
        subtotal = sum(Decimal(str(item.price)) * item.quantity for item in items)

        # 3. Calcular impuestos via TaxService
        tax_info = await self.tax_service.calculate_taxes(subtotal, region_id, currency_id)

        # 4. Serializar items a JSON
        items_json = json.dumps([item.model_dump(mode="json") for item in items])

        # 5. Actualizar carts con items + totales
        await self.db_manager.execute(
            "cart",
            """
            UPDATE carts
            SET items = ?, subtotal = ?, tax_amount = ?, igtf_amount = ?, total_with_tax = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                items_json,
                float(subtotal),
                float(tax_info.total_tax),
                float(tax_info.igtf_amount),
                float(tax_info.total),
                datetime.now().isoformat(),
                cart_id,
            ),
        )

        logger.info(
            f"Carrito {cart_id} recalculado: Subtotal={subtotal}, Impuestos={tax_info.total_tax}, Total={tax_info.total}"
        )

    async def generate_qr(self, cart_id: str) -> str:
        """
        Generar código QR con datos del pedido.
        REFACTORIZADO: Usa el 'total_with_tax'.
        """
        # 1. Obtener el carrito con los totales YA calculados
        cart = await self.get_cart(cart_id)
        if not cart:
            raise ValueError("Carrito no encontrado")

        # 2. Usar el total CON impuestos para el QR
        qr_data = {
            "cart_id": cart.id,
            "customer": cart.customer_name,
            "customer_id": cart.customer_id,
            "total": float(cart.total_with_tax),  # <-- USA EL TOTAL CORRECTO
            "subtotal": float(cart.subtotal),
            "tax": float(cart.tax_amount),
            "items_count": cart.item_count,
        }

        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(json.dumps(qr_data))
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()

        # 3. Guardar en BD
        await self.db_manager.execute(
            "cart",
            "UPDATE carts SET qr_code = ? WHERE id = ?",
            (f"data:image/png;base64,{qr_base64}", cart.id),  # Guardar el data URI
        )

        return f"data:image/png;base64,{qr_base64}"

    async def get_pending_carts(self, skip: int = 0, limit: int = 20) -> list[Cart]:
        """Obtener carritos pendientes (para el admin de ventas) con paginación."""
        rows = await self.db_manager.fetchall(
            "cart",
            "SELECT * FROM carts WHERE status = 'pending' ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, skip),
        )

        # Convertir filas a DTOs (parseando items JSON)
        carts = []
        for row in rows:
            row_data = dict(row)
            if isinstance(row_data.get("items"), str):
                row_data["items"] = json.loads(row_data["items"])
            cart = Cart.model_validate(row_data)
            carts.append(cart)

        return carts

    async def assign_guest_cart(self, cart_id: str, user_id: str, user_name: str) -> None:
        """
        Asigna un carrito de invitado a un usuario registrado.
        Se llama al hacer login si hay un carrito activo en el frontend.
        """
        # 1. Verificar si el carrito existe y es de invitado
        cart = await self.get_cart(cart_id)
        if not cart:
            return  # Si no existe, no hacemos nada

        # Si ya tiene un customer_id que NO es de invitado (empieza con 'guest-'),
        # entonces ya pertenece a alguien más (o al mismo usuario).
        if not cart.customer_id.startswith("guest-"):
            if cart.customer_id == user_id:
                return  # Ya es de este usuario
            # Si es de OTRO usuario, NO lo tocamos (seguridad)
            logger.warning(f"Intento de asignar carrito {cart_id} de {cart.customer_id} a {user_id}")
            return

        # 2. Asignar al nuevo usuario
        try:
            await self.db_manager.execute(
                "cart",
                "UPDATE carts SET customer_id = ?, customer_name = ?, updated_at = ? WHERE id = ?",
                (user_id, user_name, datetime.now().isoformat(), cart_id),
            )
            logger.info(f"Carrito invitado {cart_id} asignado a usuario {user_id} ({user_name})")
        except Exception as e:
            logger.error(f"Error al asignar carrito invitado: {e}")
            # No lanzamos error para no bloquear el login
