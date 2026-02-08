import asyncio
import logging

from ..database.manager import DatabaseManager
from ..models.customers import Customer
from ..models.sales import Sale
from .email_service import EmailService
from .invoice_service import InvoiceService

logger = logging.getLogger(__name__)


class BillingService:
    """
    Servicio de Facturación y Cola de Correos (Billing Node).
    Maneja la generación de facturas y el reintento de envíos.
    """

    def __init__(self, db: DatabaseManager):
        self.db = db
        self.email_service = EmailService()
        self.invoice_service = InvoiceService()

    async def queue_invoice(self, sale_id: str):
        """Encola una factura para ser enviada."""
        try:
            query = "UPDATE sales SET invoice_status = 'pending', invoice_retry_count = 0 WHERE id = ?"
            await self.db.execute("sales", query, (sale_id,))
            logger.info(f"Factura encolada para venta {sale_id}")
            # Trigger inmediato del procesador (fire and forget task en un app real)
            asyncio.create_task(self.process_email_queue())
        except Exception as e:
            logger.error(f"Error encolando factura {sale_id}: {e}")

    async def process_email_queue(self):
        """
        Procesa la cola de correos pendientes o fallidos.
        (Worker Task).
        """
        logger.info("Iniciando procesamiento de cola de facturas...")

        # Buscar facturas pendientes o fallidas con < 3 reintentos
        # Nota: La query se adapta a SQLite/Postgres en el manager
        query = """
            SELECT * FROM sales
            WHERE invoice_status IN ('pending', 'failed')
            AND invoice_retry_count < 3
            LIMIT 10
        """

        try:
            sales_data = await self.db.fetchall("sales", query)
            if not sales_data:
                logger.info("No hay facturas pendientes en cola.")
                return

            for sale_row in sales_data:
                await self._process_single_invoice(Sale.model_validate(sale_row))

        except Exception as e:
            logger.error(f"Error procesando cola de facturas: {e}")

    async def _process_single_invoice(self, sale: Sale):
        """Parsea datos, genera PDF y envía correo."""
        try:
            # 1. Obtener datos del cliente (identity)
            customer_query = "SELECT * FROM customers WHERE id = ?"
            customer_data = await self.db.fetchone("customers", customer_query, (sale.customer_id,))

            if not customer_data:
                logger.error(f"Cliente no encontrado para venta {sale.id}. Abortando envío.")
                await self._mark_as_failed(sale.id, "Customer not found")
                return

            customer = Customer.model_validate(customer_data)

            # 2. Generar PDF
            pdf_bytes = self.invoice_service.generate_invoice(sale, customer)

            # 3. Enviar Correo
            if not customer.email:
                logger.warning(f"Venta {sale.id}: Cliente sin email. Marcando como no enviada.")
                await self._mark_as_failed(sale.id, "No email")
                return

            subject = f"Su Factura de Compra - Pedido #{sale.id}"
            body = (
                f"Estimado {customer.name},\n\nAdjunto encontrará su factura de compra.\n\nGracias por su preferencia."
            )

            success = await self.email_service.send_email(
                to=customer.email,
                subject=subject,
                body=body,
                attachments=[(f"Factura_{sale.id}.pdf", pdf_bytes)],
                retries=1,  # El servicio de email tiene sus propios reintentos internos, aqui solo queremos saber si salió
            )

            # 4. Actualizar Estado
            if success:
                await self._mark_as_sent(sale.id)
            else:
                await self._increment_retry(sale.id)

        except Exception as e:
            logger.error(f"Error procesando factura {sale.id}: {e}")
            await self._increment_retry(sale.id)

    async def _mark_as_sent(self, sale_id: str):
        query = "UPDATE sales SET invoice_status = 'sent' WHERE id = ?"
        await self.db.execute("sales", query, (sale_id,))
        logger.info(f"Factura enviada exitosamente: {sale_id}")

    async def _mark_as_failed(self, sale_id: str, reason: str):
        # Podríamos guardar la razón en un log aparte
        query = "UPDATE sales SET invoice_status = 'failed_permanent' WHERE id = ?"
        await self.db.execute("sales", query, (sale_id,))
        logger.error(f"Factura marcada como fallo permanente: {sale_id} ({reason})")

    async def _increment_retry(self, sale_id: str):
        query = "UPDATE sales SET invoice_status = 'failed', invoice_retry_count = invoice_retry_count + 1 WHERE id = ?"
        await self.db.execute("sales", query, (sale_id,))
        logger.warning(f"Reintento incrementado para factura: {sale_id}")
