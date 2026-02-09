from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel
from sqlalchemy import JSON
from sqlmodel import Field

from .common import BaseEntity


class CartItem(BaseModel):
    """Item individual en un carrito de compras."""

    product_id: str
    product_name: str
    quantity: int = Field(..., gt=0)
    price: Decimal = Field(..., gt=0)  # Precio unitario (final_price, sin impuestos)

    @property
    def subtotal(self) -> Decimal:
        """Subtotal calculado (precio * cantidad)."""
        return (self.price * self.quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    model_config = {"from_attributes": True}


class Cart(BaseEntity, table=True):
    """Carrito de compras con items, impuestos y totales (SQLModel)."""

    __tablename__ = "carts"

    customer_name: str = Field(..., min_length=1)
    customer_id: str = Field(..., min_length=1, index=True)
    items: list[CartItem] = Field(default_factory=list, sa_type=JSON)
    status: str = Field(default="pending", index=True)
    currency_id: str = Field(...)  # REQUERIDO - sincronizado con frontend
    region_id: str = Field(...)  # REQUERIDO - sincronizado con frontend
    subtotal: Decimal = Field(default=0, max_digits=10, decimal_places=2)
    tax_amount: Decimal = Field(default=0, max_digits=10, decimal_places=2)
    igtf_amount: Decimal = Field(default=0, max_digits=10, decimal_places=2)
    total_with_tax: Decimal = Field(default=0, max_digits=10, decimal_places=2)
    qr_code: str | None = None

    @property
    def item_count(self) -> int:
        """Cantidad total de items en el carrito."""
        return sum(item.quantity for item in self.items)


class PaymentDetails(BaseModel):
    payment_method: str
    payment_type: str | None = None
    reference: str | None = None
    bank: str | None = None
    phone: str | None = None
    customer_id: str | None = None


class Sale(BaseEntity, table=True):
    __tablename__ = "sales"

    cart_id: str = Field(index=True)
    customer_name: str
    customer_id: str = Field(index=True)
    items: list[CartItem] = Field(sa_type=JSON)  # Necesitamos JSON type para SQLModel/SQLAlchemy
    currency_id: str
    payment_details: PaymentDetails = Field(sa_type=JSON)
    status: str = Field(default="completed", index=True)
    completed_by: str | None = None
    completed_at: datetime = Field(default_factory=datetime.now)
    region_id: str | None = None
    subtotal: Decimal = Field(default=0, max_digits=10, decimal_places=2)
    tax_amount: Decimal = Field(default=0, max_digits=10, decimal_places=2)
    igtf_amount: Decimal = Field(default=Decimal(0), max_digits=10, decimal_places=2)
    total_with_tax: Decimal = Field(default=0, max_digits=10, decimal_places=2)

    # Billing / Email Queue
    invoice_status: str = Field(default="pending")
    invoice_retry_count: int = Field(default=0)

    model_config = {"from_attributes": True}


class DailyReport(BaseModel):
    """DTO para el reporte de ventas diario."""

    date: str
    sales_count: int
    total: Decimal
    sales: list[Sale]

    model_config = {"from_attributes": True}
