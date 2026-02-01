"""
¡NUEVO SERVICIO!
Servicio de Ventas (Sales Service)
Maneja la lógica de completar una venta, actualizar inventario y reportes.
"""

import json
import logging
from datetime import date, datetime
from typing import Any

from ..database.manager import DatabaseManager

# Importar Modelos DTO
from ..models import DailyReport, PaymentDetails, Sale

# Importar Servicios dependientes (Inyección de Dependencias)
from .cart_service import CartService
from .product_service import ProductService

logger = logging.getLogger(__name__)


class SalesService:
    """
    Servicio para la lógica de negocio de Ventas y Cierre de Caja.
    """

    def __init__(self, db_manager: DatabaseManager, cart_service: CartService, product_service: ProductService):
        self.db_manager = db_manager
        self.cart_service = cart_service
        self.product_service = product_service
        logger.info("SalesService inicializado (con dependencias de CartService y ProductService)")

    async def complete_sale(self, cart_id: str, payment_details: PaymentDetails, completed_by: str) -> Sale:
        """
        Completa una venta desde un carrito.
        1. Valida el carrito.
        2. ¡Actualiza el stock de productos! (CRÍTICO)
        3. Crea el registro de Venta (Sale) copiando los totales (con impuestos).
        4. Actualiza el estado del Carrito (completed).
        """

        # 1. Obtener el carrito con todos los totales calculados
        cart = await self.cart_service.get_cart(cart_id)
        if not cart:
            raise ValueError(f"Carrito {cart_id} no encontrado.")
        if cart.status != "pending":
            raise ValueError(f"El carrito {cart_id} ya ha sido procesado (Estado: {cart.status}).")

        # 2. ¡Actualizar el Stock de Inventario!
        logger.info(f"Actualizando stock para {len(cart.items)} items del carrito {cart_id}...")
        try:
            for item in cart.items:
                # Restar el stock (quantity es negativa)
                await self.product_service.update_stock(item.product_id, -item.quantity)
            logger.info(f"Stock actualizado para carrito {cart_id}.")
        except ValueError as e:
            logger.error(f"Error de stock al completar venta {cart_id}: {e}")
            # (En un sistema real, aquí iría una lógica de "rollback" de transacción)
            raise ValueError(f"Error de inventario: {e}")

        # 3. Crear el registro de Venta (histórico)
        sale = Sale(
            cart_id=cart_id,
            customer_name=cart.customer_name,
            customer_id=cart.customer_id,
            items=cart.items,  # Guardar una "foto" de los items
            currency_id=cart.currency_id,
            payment_details=payment_details,
            completed_by=completed_by,
            # Copiar los datos fiscales y de totales exactos del carrito
            region_id=cart.region_id,
            subtotal=cart.subtotal,
            tax_amount=cart.tax_amount,
            total_with_tax=cart.total_with_tax,
        )

        await self.db_manager.execute(
            "sales",
            """
            INSERT INTO sales (
                id, cart_id, customer_name, customer_id, items, currency_id, 
                payment_details, status, completed_by, completed_at,
                region_id, subtotal, tax_amount, total_with_tax
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sale.id,
                sale.cart_id,
                sale.customer_name,
                sale.customer_id,
                json.dumps([item.model_dump() for item in sale.items]),  # Serializar items
                sale.currency_id,
                sale.payment_details.model_dump_json(),  # Serializar detalles de pago
                sale.status,
                sale.completed_by,
                sale.completed_at.isoformat(),
                sale.region_id,
                float(sale.subtotal),
                float(sale.tax_amount),
                float(sale.total_with_tax),
            ),
        )

        # 4. Actualizar estado del Carrito (completado)
        await self.db_manager.execute(
            "cart",
            """
            UPDATE carts SET status = 'completed', qr_code = NULL 
            WHERE id = ?
            """,
            (cart_id,),
        )

        logger.info(f"Venta {sale.id} (Carrito {cart_id}) completada por {completed_by}.")
        return sale

    async def cancel_sale(self, cart_id: str, cancelled_by: str) -> dict[str, str]:
        """Anula un carrito pendiente (no revierte stock, solo cancela el pedido)"""

        cart = await self.cart_service.get_cart(cart_id)
        if not cart:
            raise ValueError(f"Carrito {cart_id} no encontrado.")
        if cart.status != "pending":
            raise ValueError(f"El carrito {cart_id} ya ha sido procesado.")

        await self.db_manager.execute(
            "cart",
            """
            UPDATE carts SET status = 'cancelled', qr_code = NULL 
            WHERE id = ?
            """,
            (cart_id,),
        )
        logger.info(f"Carrito {cart_id} cancelado por {cancelled_by}.")
        return {"message": "Carrito anulado exitosamente"}

    async def get_daily_report(self) -> DailyReport:
        """Obtiene un resumen de las ventas del día actual"""
        today = date.today().isoformat()

        rows = await self.db_manager.fetchall(
            "sales",
            """
            SELECT * FROM sales 
            WHERE DATE(completed_at) = ? 
            ORDER BY completed_at DESC
            """,
            (today,),
        )

        sales_list = [Sale.model_validate(row) for row in rows]

        total = sum(sale.total_with_tax for sale in sales_list)

        return DailyReport(date=today, sales_count=len(sales_list), total=total, sales=sales_list)

    async def close_day_report(self, closed_by: str) -> dict[str, Any]:
        """
        Genera el reporte de cierre del día y lo guarda en la tabla 'daily_closures'.
        (Según documento: "el módulo de ventas, tiene un submódulo de cierre")
        """
        today = date.today().isoformat()

        # 1. Verificar si el día ya fue cerrado
        existing = await self.db_manager.fetchone(
            "sales",
            """
            SELECT * FROM daily_closures WHERE date = ?""",
            (today,),
        )
        if existing:
            raise ValueError("El día ya ha sido cerrado.")

        # 2. Obtener el reporte
        report = await self.get_daily_report()

        # 3. Crear el "resumen" (simplificado)
        summary_dict = {
            "total_sales": float(report.total),
            "sales_count": report.sales_count,
            "sales_ids": [sale.id for sale in report.sales],
            # (Aquí iría el desglose por método de pago)
        }

        # 4. Guardar el cierre en la DB
        await self.db_manager.execute(
            "sales",
            """
            INSERT INTO daily_closures (date, total_sales, sales_count, summary, closed_by, closed_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                today,
                float(report.total),
                report.sales_count,
                json.dumps(summary_dict),
                closed_by,
                datetime.now().isoformat(),
            ),
        )

        logger.info(f"Cierre de caja para {today} realizado por {closed_by}.")
        return summary_dict
