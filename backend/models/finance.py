from decimal import ROUND_HALF_UP, Decimal

from pydantic import Field, validator

from .common import BaseEntity


class Currency(BaseEntity):
    name: str = Field(..., min_length=1)
    symbol: str = Field(..., min_length=1, max_length=10)
    is_base: bool = False
    exchange_rate: Decimal = Field(default=Decimal("1.0"), gt=0)
    base_currency_id: str | None = None
    is_active: bool = True

    @validator("exchange_rate", pre=True)
    def convert_to_decimal(cls, v):
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v

    def convert_from_base(self, base_amount: Decimal) -> Decimal:
        """Convierte un monto de la Moneda Base (ej. Bs) a esta moneda (ej. USD)."""
        if self.is_base:
            return base_amount
        if self.exchange_rate == 0:
            return Decimal(0)
        converted = base_amount / self.exchange_rate
        return converted.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def convert_to_base(self, amount: Decimal) -> Decimal:
        """Convierte un monto de esta moneda (ej. USD) a la Moneda Base (ej. Bs)."""
        if self.is_base:
            return amount
        converted = amount * self.exchange_rate
        return converted.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class Region(BaseEntity):
    name: str = Field(..., min_length=1)
    country: str | None = None
    state: str | None = None
    city: str | None = None
    zip_code: str | None = None
    is_active: bool = True

    class Config:
        from_attributes = True


class TaxRate(BaseEntity):
    name: str = Field(..., min_length=1)
    region_id: str = Field(...)
    rate: Decimal = Field(..., ge=0)  # Tasa como decimal (ej: 0.06 para 6%)
    priority: int = Field(default=1)
    is_active: bool = True

    @validator("rate", pre=True)
    def convert_rate_to_decimal(cls, v):
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v

    def calculate(self, amount: Decimal) -> Decimal:
        """Calcula el monto de impuesto para un monto base"""
        tax_amount = amount * self.rate
        return tax_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
