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
                    id, customer_name, customer_id, status,
                    region_id, currency_id,
                    subtotal, tax_amount, total_with_tax,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    cart.id,
                    cart.customer_name,
                    cart.customer_id,
                    cart.status,
                    cart.region_id,
                    cart.currency_id,
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
        Obtiene el carrito y sus items.
        REFACTOR: Los totales ya están calculados y se leen desde la DB.
        """
        cart_row = await self.db_manager.fetchone("cart", "SELECT * FROM carts WHERE id = ?", (cart_id,))
        if not cart_row:
            return None

        items_rows = await self.db_manager.fetchall(
            "cart", "SELECT * FROM cart_items WHERE cart_id = ? ORDER BY product_name", (cart_id,)
        )

        # Convertir filas a modelos DTO
        cart = Cart.model_validate(cart_row)
        cart.items = [CartItem.model_validate(item_row) for item_row in items_rows]

        return cart

    async def add_item(self, cart_id: str, product_id: str, quantity: int) -> Cart:
        """
        Añade un item al carrito.
        REFACTORIZADO: Lógica de precios y seguridad.
        """
        if quantity <= 0:
            raise ValueError("La cantidad debe ser positiva.")

        # 1. Obtener el producto y su PRECIO REAL desde el ProductService
        #    Esto previene que el frontend manipule el precio.
        product = await self.product_service.get_product(product_id)
        if not product:
            raise ValueError(f"Producto {product_id} no encontrado.")

        if product.stock < quantity:
            raise ValueError(f"Stock insuficiente para {product.name} (Stock: {product.stock})")

        # 2. Obtener el precio final (con descuentos)
        item_price = product.final_price  # Ej: 45.00
        item_name = product.name

        # 3. Insertar o actualizar el item en la DB
        existing_item = await self.db_manager.fetchone(
            "cart", "SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?", (cart_id, product_id)
        )

        if existing_item:
            new_quantity = existing_item["quantity"] + quantity
            # Validar stock de nuevo
            if product.stock < new_quantity:
                raise ValueError(
                    f"Stock insuficiente para {product.name} (Solicitado: {new_quantity}, Stock: {product.stock})"
                )

            await self.db_manager.execute(
                "cart",
                "UPDATE cart_items SET quantity = ?, price = ? WHERE cart_id = ? AND product_id = ?",
                (new_quantity, float(item_price), cart_id, product_id),
            )
        else:
            await self.db_manager.execute(
                "cart",
                "INSERT INTO cart_items (cart_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)",
                (cart_id, product_id, item_name, quantity, float(item_price)),
            )

        # 4. Recalcular todos los totales del carrito (Subtotal + Impuestos)
        return await self._update_cart_totals(cart_id)

    async def remove_item(self, cart_id: str, product_id: str) -> Cart:
        """¡NUEVO! Elimina un item del carrito"""
        await self.db_manager.execute(
            "cart", "DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?", (cart_id, product_id)
        )
        return await self._update_cart_totals(cart_id)

    async def update_item_quantity(self, cart_id: str, product_id: str, new_quantity: int) -> Cart:
        """¡NUEVO! Actualiza la cantidad de un item"""
        if new_quantity <= 0:
            return await self.remove_item(cart_id, product_id)

        # Validar stock
        product = await self.product_service.get_product(product_id)
        if not product:
            raise ValueError(f"Producto {product_id} no encontrado.")
        if product.stock < new_quantity:
            raise ValueError(f"Stock insuficiente para {product.name} (Stock: {product.stock})")

        await self.db_manager.execute(
            "cart",
            "UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?",
            (new_quantity, cart_id, product_id),
        )
        return await self._update_cart_totals(cart_id)

    async def _update_cart_totals(self, cart_id: str) -> Cart:
        """
        ¡NUEVO MÉTODO PRIVADO! (El Motor de Cálculo)
        Recalcula el subtotal, llama al TaxService y actualiza el carrito.
        """

        # 1. Obtener la región fiscal del carrito
        cart_row = await self.db_manager.fetchone("cart", "SELECT region_id FROM carts WHERE id = ?", (cart_id,))
        if not cart_row:
            raise ValueError("Carrito no encontrado durante el recálculo.")
        region_id = cart_row["region_id"]

        # 2. Calcular Subtotal (Suma de precios base de los items)
        subtotal_row = await self.db_manager.fetchone(
            "cart", "SELECT SUM(price * quantity) as subtotal FROM cart_items WHERE cart_id = ?", (cart_id,)
        )
        subtotal_val = subtotal_row["subtotal"] if subtotal_row else 0.0
        subtotal = Decimal(str(subtotal_val or "0.0"))

        # 3. Llamar al TaxService para calcular impuestos
        #    (Aquí ocurre la lógica de Filadelfia 6% + 2%)
        tax_info = await self.tax_service.calculate_taxes(subtotal, region_id)

        tax_amount = tax_info["tax_amount"]
        total_with_tax = tax_info["total_with_tax"]

        # 4. Actualizar la tabla 'carts' con los nuevos totales
        await self.db_manager.execute(
            "cart",
            """
            UPDATE carts
            SET subtotal = ?, tax_amount = ?, total_with_tax = ?, updated_at = ?
            WHERE id = ?
            """,
            (float(subtotal), float(tax_amount), float(total_with_tax), datetime.now().isoformat(), cart_id),
        )

        logger.info(
            f"Carrito {cart_id} recalculado: Subtotal={subtotal}, Impuestos={tax_amount}, Total={total_with_tax}"
        )

        # 5. Devolver el DTO del carrito actualizado
        return await self.get_cart(cart_id) or Cart(  # Fallback seguro, aunque debería existir
            id=cart_id,
            customer_name="",
            customer_id="",
            region_id="",
            currency_id="",
            subtotal=Decimal(0),
            tax_amount=Decimal(0),
            total_with_tax=Decimal(0),
            status="pending",
            created_at=datetime.now(),
            updated_at=datetime.now(),
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

        # Convertir filas a DTOs
        carts = []
        for row in rows:
            cart = Cart.model_validate(row)
            # (Opcional) Cargar items para cada uno si es necesario
            # items_rows = await self.db_manager.fetchall("cart", "...", (cart.id,))
            # cart.items = [CartItem.model_validate(r) for r in items_rows]
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
