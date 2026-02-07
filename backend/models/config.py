from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, validator

from .common import BACKEND_URL


class SocialNetwork(BaseModel):
    """Modelo de red social para BusinessInfo. Sincronizado con frontend."""

    name: str
    url: str
    icon: str | None = None


class BusinessInfo(BaseModel):
    """Información del negocio."""

    name: str = "E-Commerce"
    rif: str | None = None
    address: str | None = None  # Dirección Fiscal
    phone: str | None = None  # Teléfono
    contact: str | None = None
    social_networks: list[SocialNetwork] = Field(default_factory=list)  # TIPADO FUERTE
    logo_url: str | None = None
    icon_url: str | None = None
    banner_url: str | None = None
    updated_at: datetime = Field(default_factory=datetime.now)

    @validator("logo_url", "icon_url", "banner_url", pre=True, always=True)
    def add_host_to_url(cls, v):
        """Añade el host base a URLs relativas."""
        if v and not v.startswith("http"):
            return f"{BACKEND_URL}{v}"
        return v

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat() + "Z", Decimal: lambda v: float(v)}


class Customization(BaseModel):
    primary_color: str = "#264192"
    secondary_color: str = "#ffdd00"
    accent_color: str = "#ffffff"
    font_family: str = "Poppins"
    custom_css: str | None = None
    updated_at: datetime = Field(default_factory=datetime.now)
    # Fiscal Data
    name: str | None = None
    rif: str | None = None
    address: str | None = None
    phone: str | None = None
    # Icons
    icon_products_url: str | None = None
    icon_business_url: str | None = None
    icon_customization_url: str | None = None
    icon_finance_url: str | None = None
    icon_sales_url: str | None = None
    icon_users_url: str | None = None
    icon_tax_url: str | None = None

    @validator(
        "icon_products_url",
        "icon_business_url",
        "icon_customization_url",
        "icon_finance_url",
        "icon_sales_url",
        "icon_users_url",
        "icon_tax_url",
        pre=True,
        always=True,
    )
    def add_host_to_icon_url(cls, v):
        """Añade el host base a URLs relativas de iconos."""
        if v and not v.startswith("http"):
            return f"{BACKEND_URL}{v}"
        return v

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat() + "Z", Decimal: lambda v: float(v)}
