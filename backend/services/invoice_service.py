import logging
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

# from weasyprint import HTML  # Comentado hasta que se instale dependencia
from ..core.config import settings
from ..models import Sale
from .business_service import BusinessService
from .email_service import EmailService  # Asumimos existencia o crearemos

logger = logging.getLogger(__name__)


class InvoiceService:
    """
    Servicio de Generación y Envío de Facturas (Fiscal/Proforma).
    Dependencias: BusinessService (Emisor), EmailService (Envío).
    """

    def __init__(self, business_service: BusinessService, email_service: EmailService):
        self.business_service = business_service
        self.email_service = email_service

        # Configurar Jinja2
        self.templates_dir = Path("./backend/templates")
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        self.env = Environment(loader=FileSystemLoader(str(self.templates_dir)))
        logger.info("InvoiceService inicializado.")

    async def generate_and_send_invoice(self, sale: Sale):
        """
        Orquesta la generación y envío de la factura.
        Checkea flags de configuración antes de proceder.
        Recibe el objeto Sale completo para evitar consulta circular.
        """
        sale_id = sale.id

        # 1. Validar Flags
        if not settings.ENABLE_EMAIL:
            logger.info(f"Facturación omitida para venta {sale_id}: Email desactivado.")
            return

        if not settings.FISCAL_MODULE_ENABLED:
            logger.info(f"Facturación omitida para venta {sale_id}: Módulo Fiscal desactivado.")
            return

        # 2. Obtener Datos
        # Necesitamos un metodo en SalesService para obtener venta por ID (o db_manager directo)
        # Por ahora asumimos que sale_id es válido.
        # TODO: Implementar get_sale_by_id en SalesService si no existe

        # business_info = await self.business_service.get_business_info()

        logger.info(f"Generando factura para venta {sale_id} (Simulación Proforma)...")

        # 3. Renderizar HTML (Jinja2)
        # template = self.env.get_template("invoice_template.html")
        # html_content = template.render(sale=sale, business=business_info)

        # 4. Generar PDF (WeasyPrint)
        # pdf_bytes = HTML(string=html_content).write_pdf()

        # 5. Enviar Email
        # await self.email_service.send_email(
        #     to=sale.customer_email,
        #     subject=f"Factura {sale.control_number}",
        #     attachments=[("factura.pdf", pdf_bytes, "application/pdf")]
        # )

        logger.info(f"Factura generada y enviada para venta {sale_id} (Simulado).")
