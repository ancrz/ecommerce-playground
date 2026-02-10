import asyncio
import logging
from datetime import datetime
from decimal import Decimal

from fpdf import FPDF

# Importar dependencias (Type hints only to avoid circular imports if needed)
from ..database.manager import DatabaseManager

# Importar modelos
from ..models import BusinessInfo, Customer
from ..models.sales import CartItem, PaymentDetails, Sale
from .business_service import BusinessService

logger = logging.getLogger(__name__)


class PDF(FPDF):
    """Clase extendida de FPDF para Header/Footer personalizados."""

    def __init__(self, business_info: BusinessInfo = None):
        super().__init__()
        self.business_info = business_info

    def header(self):
        # Logo placeholder or Text
        self.set_font("helvetica", "B", 15)
        # self.cell(80)
        # Si quisiéramos logo:
        # if self.business_info and self.business_info.logo_url:
        #    ...

        # Titulo centrado
        title = "FACTURA"
        self.cell(0, 10, title, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.cell(0, 10, f"Página {self.page_no()}/{{nb}}", align="C")


class InvoiceService:
    """
    Servicio de Generación de Facturas PDF (Billing Node).
    Ahora integrado con BusinessService para datos fiscales.
    """

    def __init__(self, db_manager: DatabaseManager, business_service: BusinessService):
        self.db_manager = db_manager
        self.business_service = business_service

    async def generate_and_send_invoice(self, sale: Sale):
        """
        Orquesta la generación y envío (simulado) de la factura.
        Llamado por SalesService.
        """
        try:
            # 1. Obtener datos fiscales del negocio
            business = await self.business_service.get_business_info()

            # 2. Obtener datos del cliente "full" (con dirección fiscal)
            # Intentamos buscarlo en la tabla 'customers' (si existe lógica de clientes)
            # Si no, usamos lo básico del Sale.
            customer = await self._fetch_customer(sale.customer_id, sale.customer_name)

            # 3. Generar PDF
            pdf_bytes = await self.generate_invoice(sale, customer, business)

            # 4. "Enviar" (Simulación: Guardar en disco o log)
            # En un sistema real, aquí llamaríamos a EmailService
            logger.info(
                f"Factura generada exitosamente ({len(pdf_bytes)} bytes). Simulando envío a {customer.email or 'N/A'}"
            )

            # (Opcional) Guardar en disco para debug
            # with open(f"data/invoices/{filename}", "wb") as f:
            #     f.write(pdf_bytes)

        except Exception as e:
            logger.error(f"Error en flujo de facturación para venta {sale.id}: {e}", exc_info=True)
            # No relanzamos para no romper la venta, solo logueamos (Fail-open logic)

    async def generate_invoice(self, sale: Sale, customer: Customer, business: BusinessInfo) -> bytes:
        """
        Genera el PDF de la factura para una venta real.
        Retorna los bytes del PDF.
        Hacemos run_in_executor para no bloquear el loop principal con FPDF.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._generate_pdf_sync, sale, customer, business, False)

    async def generate_preview(self, custom_business_info: BusinessInfo = None) -> bytes:
        """
        Genera una factura con datos 'Placeholder/Mock' para el preview del Admin.
        Permite inyectar business_info temporal (desde el formulario) para pre-visualizar cambios.
        """
        # 1. Si no viene info custom, obtenemos la de la BD
        if not custom_business_info:
            custom_business_info = await self.business_service.get_business_info()

        # 2. Mocks para el preview (Cliente y Venta)
        mock_customer = Customer(
            cedula="J-12345678-9",
            name="Cliente Genérico C.A.",
            address="Av. Principal, Edificio Empresarial, Piso 1",
            phone="+58 412 1234567",
            email="cliente@ejemplo.com",
            id="mock_cust_id",
        )

        mock_items = [
            CartItem(product_id="p1", product_name="Paracetamol 500mg", quantity=2, price=Decimal("5.00")),
            CartItem(product_id="p2", product_name="Vitamina C", quantity=1, price=Decimal("12.50")),
        ]

        # Objeto Sale híbrido/mock
        mock_sale = Sale(
            id="PREVIEW-001",
            cart_id="mock_cart",
            customer_name=mock_customer.name,
            customer_id=mock_customer.id,
            items=mock_items,
            currency_id="USD",
            payment_details=PaymentDetails(payment_method="cash"),
            subtotal=Decimal("22.50"),
            tax_amount=Decimal("3.60"),
            igtf_amount=Decimal("0.00"),
            total_with_tax=Decimal("26.10"),
            status="completed",
            completed_at=datetime.now(),
        )

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._generate_pdf_sync, mock_sale, mock_customer, custom_business_info, True
        )

    def _generate_pdf_sync(self, sale: Sale, customer: Customer, business: BusinessInfo, is_preview: bool) -> bytes:
        """
        Lógica sincrónica de FPDF.
        """
        pdf = self._create_pdf_structure(sale, customer, business, is_preview)
        return bytes(pdf.output())

    def _create_pdf_structure(
        self, sale: Sale, customer: Customer, business: BusinessInfo, is_preview: bool = False
    ) -> PDF:
        """Construye la estructura del PDF (Común para Real y Preview)."""
        pdf = PDF(business_info=business)
        pdf.add_page()
        pdf.set_font("helvetica", size=12)

        if is_preview:
            pdf.set_text_color(200, 200, 200)
            pdf.set_font("helvetica", "B", 50)
            with pdf.rotation(45, 105, 148):
                pdf.text(30, 190, "VISTA PREVIA")
            pdf.set_text_color(0, 0, 0)
            pdf.set_font("helvetica", size=12)

        # 1. Datos de la Empresa (Dinámicos desde BusinessInfo)
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, business.name or "Nombre de Empresa No Configurado", new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("helvetica", size=10)
        pdf.cell(0, 5, f"RIF: {business.rif or 'N/A'}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"Dirección: {business.address or 'N/A'}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"Teléfono: {business.phone or 'N/A'}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        # 2. Datos del Cliente
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(0, 10, "Facturar a:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", size=10)
        pdf.cell(0, 5, f"Razón Social: {customer.name}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"Cédula/RIF: {customer.cedula}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"Dirección: {customer.address or 'N/A'}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"Teléfono: {customer.phone or 'N/A'}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        # 3. Detalles de la Venta
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(40, 8, "Factura Nro:", border=0)
        pdf.set_font("helvetica", size=11)
        pdf.cell(50, 8, f"{sale.id if not is_preview else 'PREVIEW'}", border=0, new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("helvetica", "B", 11)
        pdf.cell(40, 8, "Fecha:", border=0)
        pdf.set_font("helvetica", size=11)
        pdf.cell(50, 8, f"{sale.completed_at.strftime('%Y-%m-%d %H:%M')}", border=0, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        # 4. Tabla de Items
        pdf.set_font("helvetica", "B", 10)
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(100, 8, "Producto", 1, 0, "C", fill=True)
        pdf.cell(30, 8, "Cant.", 1, 0, "C", fill=True)
        pdf.cell(30, 8, "Precio", 1, 0, "C", fill=True)
        pdf.cell(30, 8, "Total", 1, 1, "C", fill=True)

        pdf.set_font("helvetica", size=10)
        for item in sale.items:
            pdf.cell(100, 8, item.product_name[:50], 1)
            pdf.cell(30, 8, str(item.quantity), 1, 0, "C")
            pdf.cell(30, 8, f"{item.price:.2f}", 1, 0, "R")
            pdf.cell(30, 8, f"{item.subtotal:.2f}", 1, 1, "R")

        # 5. Totales
        pdf.ln(5)
        pdf.set_font("helvetica", "B", 10)

        # Helper para fila de totales
        def total_row(label, value, is_bold=False):
            if is_bold:
                pdf.set_font("helvetica", "B", 10)
            else:
                pdf.set_font("helvetica", size=10)
            pdf.cell(130, 8, "", 0)
            pdf.cell(30, 8, label, 1, 0, "R", fill=True)
            pdf.cell(30, 8, f"{value:.2f}", 1, 1, "R")

        total_row("Subtotal:", sale.subtotal)
        total_row("Impuestos:", sale.tax_amount)  # Includes IGTF technically, but let's separate if needed

        if sale.igtf_amount > 0:
            total_row("IGTF (3%):", sale.igtf_amount)

        pdf.set_font("helvetica", "B", 12)
        pdf.cell(130, 10, "", 0)
        pdf.cell(30, 10, "TOTAL:", 1, 0, "R", fill=True)
        pdf.cell(30, 10, f"{sale.total_with_tax:.2f}", 1, 1, "R", fill=True)

        return pdf

    async def _fetch_customer(self, customer_id: str, fallback_name: str) -> Customer:
        """Helper para obtener cliente o devolver fallback."""
        try:
            # Intentar buscar en DB (Asumiendo tabla 'customers' o similar)
            # Como no tenemos 'CustomerService' claro, acceso directo por Manager.
            row = await self.db_manager.fetchone("users", "SELECT * FROM customers WHERE cedula = ?", (customer_id,))
            if row:
                return Customer.model_validate(dict(row))
        except Exception as e:
            logger.warning(f"No se pudo obtener cliente {customer_id} de DB: {e}")

        # Fallback: Crear objeto temporal con lo que tenemos
        return Customer(
            cedula=customer_id, name=fallback_name, address="Dirección no registrada", phone=None, email=None
        )
