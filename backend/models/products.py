import uuid
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel, Field, computed_field, validator

from .common import BaseEntity


class ProductCard(BaseModel):
    id: str
    name: str
    description: str = ""  # Force string (no Optional)
    price: Decimal
    final_price: Decimal
    image_url: str | None
    is_featured: bool
    is_discount: bool
    discount_percentage: Decimal

    class Config:
        json_encoders = {Decimal: lambda v: float(v)}
        from_attributes = True


class Product(BaseEntity):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    sku: str | None = None
    price: Decimal = Field(..., gt=0)  # Precio Base (Asumido en Moneda Base)
    stock: int = Field(default=0, ge=0)
    category: str | None = None
    image_url: str | None = None
    is_featured: bool = False
    is_discount: bool = False
    discount_percentage: Decimal = Field(default=0, ge=0, le=100)
    banner_assignment: str = Field(default="main")

    @validator("price", "discount_percentage", pre=True)
    def convert_to_decimal(cls, v):
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v

    @computed_field
    @property
    def final_price(self) -> Decimal:
        """Precio final calculado con descuento aplicado."""
        if self.is_discount and self.discount_percentage > 0:
            discount = self.price * (self.discount_percentage / 100)
            final = self.price - discount
            return final.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return self.price

    def to_card(self) -> "ProductCard":
        final_price = self.final_price
        return ProductCard(
            id=self.id,
            name=self.name,
            description=self.description or "",  # Force string
            price=self.price,
            final_price=final_price,
            image_url=self.image_url,
            is_featured=self.is_featured,
            is_discount=self.is_discount,
            discount_percentage=self.discount_percentage,
        )


class ProductImage(BaseModel):
    """
    Imagen asociada a un producto.
    Soporta múltiples imágenes por producto con una imagen principal (is_main).
    """

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str = Field(...)
    image_url: str = Field(...)
    thumbnail_url: str | None = None
    is_main: bool = Field(default=False)
    display_order: int = Field(default=0)
    alt_text: str | None = None
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat() + "Z"}


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    sku: str | None = None
    price: Decimal = Field(..., gt=0)
    stock: int = Field(default=0, ge=0)
    category: str | None = None
    image_url: str | None = None
    is_featured: bool = False
    is_discount: bool = False
    discount_percentage: Decimal = Field(default=0, ge=0, le=100)
    banner_assignment: str = Field(default="main")

    @validator("price", "discount_percentage", pre=True)
    def convert_to_decimal(cls, v):
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v


class ProductUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    sku: str | None = None
    price: Decimal | None = Field(None, gt=0)
    stock: int | None = Field(None, ge=0)
    category: str | None = None
    image_url: str | None = None
    is_featured: bool | None = None
    is_discount: bool | None = None
    discount_percentage: Decimal | None = Field(None, ge=0, le=100)
    banner_assignment: str | None = None

    @validator("price", "discount_percentage", pre=True)
    def convert_to_decimal(cls, v):
        if v is None:
            return None
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v
