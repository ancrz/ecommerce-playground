import logging
from datetime import datetime
from decimal import Decimal

from fpdf import FPDF

from ..models.customers import Customer
from ..models.sales import CartItem, PaymentDetails, Sale

logger = logging.getLogger(__name__)


class PDF(FPDF):
    """Clase extendida de FPDF para Header/Footer personalizados."""

    def header(self):
        # Logo placeholder
        self.set_font("helvetica", "B", 15)
        self.cell(80)
        self.cell(30, 10, "FACTURA", align="C")
        self.ln(20)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.cell(0, 10, f"Página {self.page_no()}/{{nb}}", align="C")


class InvoiceService:
    """
    Servicio de Generación de Facturas PDF (Billing Node).
    """

    def generate_invoice(self, sale: Sale, customer: Customer) -> bytes:
        """
        Genera el PDF de la factura para una venta real.
        Retorna los bytes del PDF.
        """
        try:
            pdf = self._create_pdf_structure(sale, customer)
            return bytes(pdf.output())
        except Exception as e:
            logger.error(f"Error generando factura PDF: {e}")
            raise

    def generate_preview(self) -> bytes:
        """
        Genera una factura con datos 'Placeholder/Mock' para el preview del Admin.
        (Abstract Merge/Preview).
        """
        # Mocks para el preview
        mock_customer = Customer(
            cedula="J-12345678-9",
            name="Cliente Genérico C.A.",
            address="Av. Principal, Edificio Empresarial, Piso 1",
            phone="+58 412 1234567",
            email="cliente@ejemplo.com",
            id="mock_cust_id",
            created_at=datetime.now(),
            updated_at=datetime.now(),
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
            payment_details=PaymentDetails(payment_method="cash"),  # FIX: Use PaymentDetails
            subtotal=Decimal("22.50"),
            tax_amount=Decimal("3.60"),
            igtf_amount=Decimal("0.00"),
            total_with_tax=Decimal("26.10"),
            status="completed",
            completed_at=datetime.now(),
        )

        pdf = self._create_pdf_structure(mock_sale, mock_customer, is_preview=True)
        return bytes(pdf.output())

    def _create_pdf_structure(self, sale: Sale, customer: Customer, is_preview: bool = False) -> PDF:
        """Construye la estructura del PDF (Común para Real y Preview)."""
        pdf = PDF()
        pdf.add_page()
        pdf.set_font("helvetica", size=12)

        if is_preview:
            pdf.set_text_color(200, 200, 200)
            pdf.set_font("helvetica", "B", 50)
            with pdf.rotation(45, 105, 148):
                pdf.text(30, 190, "VISTA PREVIA")
            pdf.set_text_color(0, 0, 0)
            pdf.set_font("helvetica", size=12)

        # Datos de la Empresa (Hardcoded por ahora, luego desde Config)
        pdf.cell(0, 10, "Farmalux E-Commerce", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", size=10)
        pdf.cell(0, 5, "RIF: J-00000000-0", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, "Dirección Fiscal de la Empresa", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        # Datos del Cliente
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(0, 10, "Datos del Cliente:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", size=10)
        pdf.cell(0, 5, f"Razón Social: {customer.name}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"Cédula/RIF: {customer.cedula}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"Dirección: {customer.address or 'N/A'}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"Teléfono: {customer.phone or 'N/A'}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        # Detalles de la Venta
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(95, 8, "Factura Nro:", border=0)
        pdf.set_font("helvetica", size=11)
        pdf.cell(95, 8, f"{sale.id if not is_preview else '0000'}", border=0, new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("helvetica", "B", 11)
        pdf.cell(95, 8, "Fecha:", border=0)
        pdf.set_font("helvetica", size=11)
        pdf.cell(95, 8, f"{sale.completed_at.strftime('%Y-%m-%d %H:%M')}", border=0, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        # Tabla de Items
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

        # Totales
        pdf.ln(5)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(130, 8, "", 0)
        pdf.cell(30, 8, "Subtotal:", 1, 0, "R", fill=True)
        pdf.cell(30, 8, f"{sale.subtotal:.2f}", 1, 1, "R")

        pdf.cell(130, 8, "", 0)
        pdf.cell(30, 8, "Impuestos:", 1, 0, "R", fill=True)
        pdf.cell(30, 8, f"{sale.tax_amount:.2f}", 1, 1, "R")

        if sale.igtf_amount > 0:
            pdf.cell(130, 8, "", 0)
            pdf.cell(30, 8, "IGTF (3%):", 1, 0, "R", fill=True)
            pdf.cell(30, 8, f"{sale.igtf_amount:.2f}", 1, 1, "R")

        pdf.set_font("helvetica", "B", 12)
        pdf.cell(130, 10, "", 0)
        pdf.cell(30, 10, "TOTAL:", 1, 0, "R", fill=True)
        pdf.cell(30, 10, f"{sale.total_with_tax:.2f}", 1, 1, "R", fill=True)

        return pdf
