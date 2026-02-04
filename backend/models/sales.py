from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel, Field, computed_field

from .common import BaseEntity


class CartItem(BaseModel):
    """Item individual en un carrito de compras."""

    product_id: str
    product_name: str
    quantity: int = Field(..., gt=0)
    price: Decimal = Field(..., gt=0)  # Precio unitario (final_price, sin impuestos)

    @computed_field
    @property
    def subtotal(self) -> Decimal:
        """Subtotal calculado (precio * cantidad)."""
        return (self.price * self.quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    class Config:
        json_encoders = {Decimal: lambda v: float(v)}
        from_attributes = True


class Cart(BaseEntity):
    """Carrito de compras con items, impuestos y totales."""

    customer_name: str = Field(..., min_length=1)
    customer_id: str = Field(..., min_length=1)
    items: list[CartItem] = Field(default_factory=list)
    status: str = Field(default="pending")
    currency_id: str = Field(...)  # REQUERIDO - sincronizado con frontend
    region_id: str = Field(...)  # REQUERIDO - sincronizado con frontend
    subtotal: Decimal = Field(default=0)
    tax_amount: Decimal = Field(default=0)
    total_with_tax: Decimal = Field(default=0)
    qr_code: str | None = None

    @computed_field
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


class Sale(BaseEntity):
    cart_id: str
    customer_name: str
    customer_id: str
    items: list[CartItem]
    currency_id: str
    payment_details: PaymentDetails
    status: str = Field(default="completed")
    completed_by: str | None = None
    completed_at: datetime = Field(default_factory=datetime.now)
    region_id: str | None = None
    subtotal: Decimal = Field(...)
    tax_amount: Decimal = Field(...)
    total_with_tax: Decimal = Field(...)

    class Config:
        json_encoders = {Decimal: lambda v: float(v), datetime: lambda v: v.isoformat()}
        from_attributes = True


class DailyReport(BaseModel):
    """DTO para el reporte de ventas diario."""

    date: str
    sales_count: int
    total: Decimal
    sales: list[Sale]

    class Config:
        json_encoders = {Decimal: lambda v: float(v)}
        from_attributes = True
