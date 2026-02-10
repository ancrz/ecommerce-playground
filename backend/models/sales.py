from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel, computed_field, field_serializer
from sqlalchemy import JSON
from sqlmodel import Field

from .common import BaseEntity


class CartItem(BaseModel):
    """Item individual en un carrito de compras."""

    product_id: str
    product_name: str
    quantity: int = Field(..., gt=0)
    price: Decimal = Field(..., gt=0)  # Precio unitario (final_price, sin impuestos)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def subtotal(self) -> Decimal:
        """Subtotal calculado (precio * cantidad)."""
        return (self.price * self.quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @field_serializer("price")
    def serialize_price(self, v: Decimal, _info):
        return float(v)

    @field_serializer("subtotal")
    def serialize_subtotal(self, v: Decimal, _info):
        return float(v)

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

    @field_serializer("subtotal", "tax_amount", "igtf_amount", "total_with_tax")
    def serialize_decimals(self, v: Decimal, _info):
        return float(v)

    @property
    def item_count(self) -> int:
        """Cantidad total de items en el carrito."""
        return sum(item.quantity for item in self.items)


class PaymentDetails(BaseModel):
    """Detalles de pago. Los campos opcionales se serializan como string vacio si son null."""

    payment_method: str
    payment_type: str | None = None
    reference: str | None = None
    bank: str | None = None
    phone: str | None = None
    customer_id: str | None = None

    @field_serializer("payment_type", "reference", "bank", "phone", "customer_id")
    def serialize_optional_strings(self, v: str | None, _info):
        """Convierte None a undefined-safe: Zod .optional() no acepta null, pero si omitimos
        el campo no aparece en JSON. En su lugar, devolvemos el valor tal cual y ajustamos
        el schema Zod a .nullable().optional() para aceptar ambos."""
        return v


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

    @field_serializer("subtotal", "tax_amount", "igtf_amount", "total_with_tax")
    def serialize_decimals(self, v: Decimal, _info):
        return float(v)

    @field_serializer("completed_at")
    def serialize_completed_at(self, dt: datetime, _info):
        # Formato ISO 8601 estricto con "Z" suffix para compatibilidad con Zod
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    model_config = {"from_attributes": True}


class DailyReport(BaseModel):
    """DTO para el reporte de ventas diario."""

    date: str
    sales_count: int
    total: Decimal
    sales: list[Sale]

    @field_serializer("total")
    def serialize_total(self, v: Decimal, _info):
        return float(v)

    model_config = {"from_attributes": True}


class SalesHistoryResponse(BaseModel):
    """DTO para respuesta paginada del historial de ventas."""

    items: list[Sale]
    total: int
    skip: int
    limit: int

    model_config = {"from_attributes": True}
