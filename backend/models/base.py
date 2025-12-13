"""
Modelos base del sistema con encapsulamiento y decoradores
REFACTORIZADO: (RBAC + Autogestión de Correo/Contraseña)
HOMOLOGACIÓN: Sincronizado con frontend/src/schemas.ts
"""

from pydantic import BaseModel, Field, validator, computed_field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import uuid
import os

# URL base para generar URLs completas de imágenes
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8042")


class BaseEntity(BaseModel):
    """Entidad base con funcionalidades comunes"""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        from_attributes = True # Permite cargar desde objetos de BD
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z',
            Decimal: lambda v: float(v)
        }
    
    def update_timestamp(self):
        """Actualizar timestamp de modificación"""
        self.updated_at = datetime.now()


# ==================== MODELOS DE PRODUCTOS ====================
# (Validados en auditoría anterior, incluyen DTOs de Intención)

class Product(BaseEntity):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    sku: Optional[str] = None
    price: Decimal = Field(..., gt=0) # Precio Base (Asumido en Moneda Base)
    stock: int = Field(default=0, ge=0)
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_featured: bool = False
    is_discount: bool = False
    discount_percentage: Decimal = Field(default=0, ge=0, le=100)
    banner_assignment: str = Field(default="main")
    
    @validator('price', 'discount_percentage', pre=True)
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
            return final.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return self.price
    
    def to_card(self) -> 'ProductCard':
        final_price = self.final_price
        return ProductCard(
            id=self.id,
            name=self.name,
            description=self.description or "", # Force string
            price=self.price,
            final_price=final_price,
            image_url=self.image_url,
            is_featured=self.is_featured,
            is_discount=self.is_discount,
            discount_percentage=self.discount_percentage
        )

class ProductCard(BaseModel):
    id: str
    name: str
    description: str = "" # Force string (no Optional)
    price: Decimal
    final_price: Decimal
    image_url: Optional[str]
    is_featured: bool
    is_discount: bool
    discount_percentage: Decimal
    
    class Config:
        json_encoders = {Decimal: lambda v: float(v)}
        from_attributes = True

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    sku: Optional[str] = None
    price: Decimal = Field(..., gt=0)
    stock: int = Field(default=0, ge=0)
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_featured: bool = False
    is_discount: bool = False
    discount_percentage: Decimal = Field(default=0, ge=0, le=100)
    banner_assignment: str = Field(default="main")

    @validator('price', 'discount_percentage', pre=True)
    def convert_to_decimal(cls, v):
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    sku: Optional[str] = None
    price: Optional[Decimal] = Field(None, gt=0)
    stock: Optional[int] = Field(None, ge=0)
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_featured: Optional[bool] = None
    is_discount: Optional[bool] = None
    discount_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    banner_assignment: Optional[str] = None

    @validator('price', 'discount_percentage', pre=True)
    def convert_to_decimal(cls, v):
        if v is None:
            return None
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v


# ==================== MODELOS FINANCIEROS ====================
# (Validados en auditoría anterior, con impuestos desacoplados)

class Currency(BaseEntity):
    name: str = Field(..., min_length=1)
    symbol: str = Field(..., min_length=1, max_length=10)
    is_base: bool = False
    exchange_rate: Decimal = Field(default=Decimal("1.0"), gt=0) 
    base_currency_id: Optional[str] = None
    is_active: bool = True
    
    @validator('exchange_rate', pre=True)
    def convert_to_decimal(cls, v):
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v
    
    def convert_from_base(self, base_amount: Decimal) -> Decimal:
        """ Convierte un monto de la Moneda Base (ej. Bs) a esta moneda (ej. USD). """
        if self.is_base:
            return base_amount
        if self.exchange_rate == 0:
            return Decimal(0)
        converted = base_amount / self.exchange_rate
        return converted.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def convert_to_base(self, amount: Decimal) -> Decimal:
        """ Convierte un monto de esta moneda (ej. USD) a la Moneda Base (ej. Bs). """
        if self.is_base:
            return amount
        converted = amount * self.exchange_rate
        return converted.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

class Region(BaseEntity):
    name: str = Field(..., min_length=1)
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    is_active: bool = True
    
    class Config:
        from_attributes = True

class TaxRate(BaseEntity):
    name: str = Field(..., min_length=1)
    region_id: str = Field(...)
    rate: Decimal = Field(..., ge=0) # Tasa como decimal (ej: 0.06 para 6%)
    priority: int = Field(default=1)
    is_active: bool = True
    
    @validator('rate', pre=True)
    def convert_rate_to_decimal(cls, v):
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v
        
    def calculate(self, amount: Decimal) -> Decimal:
        """ Calcula el monto de impuesto para un monto base """
        tax_amount = amount * self.rate
        return tax_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


# ==================== MODELOS DE CARRITO ====================
# (Validados en auditoría anterior)

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
        return (self.price * self.quantity).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    class Config:
        json_encoders = {Decimal: lambda v: float(v)}
        from_attributes = True

class Cart(BaseEntity):
    """Carrito de compras con items, impuestos y totales."""
    customer_name: str = Field(..., min_length=1)
    customer_id: str = Field(..., min_length=1)
    items: List[CartItem] = Field(default_factory=list)
    status: str = Field(default="pending")
    currency_id: str = Field(...)  # REQUERIDO - sincronizado con frontend
    region_id: str = Field(...)    # REQUERIDO - sincronizado con frontend
    subtotal: Decimal = Field(default=0)
    tax_amount: Decimal = Field(default=0)
    total_with_tax: Decimal = Field(default=0)
    qr_code: Optional[str] = None
    
    @computed_field
    @property
    def item_count(self) -> int:
        """Cantidad total de items en el carrito."""
        return sum(item.quantity for item in self.items)


# ==================== MODELOS DE VENTAS ====================
# (Validados en auditoría anterior)

class PaymentDetails(BaseModel):
    payment_method: str
    payment_type: Optional[str] = None
    reference: Optional[str] = None
    bank: Optional[str] = None
    phone: Optional[str] = None
    customer_id: Optional[str] = None

class Sale(BaseEntity):
    cart_id: str
    customer_name: str
    customer_id: str
    items: List[CartItem]
    currency_id: str
    payment_details: PaymentDetails
    status: str = Field(default="completed")
    completed_by: Optional[str] = None
    completed_at: datetime = Field(default_factory=datetime.now)
    region_id: Optional[str] = None
    subtotal: Decimal = Field(...)
    tax_amount: Decimal = Field(...)
    total_with_tax: Decimal = Field(...)
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat()
        }
        from_attributes = True


class DailyReport(BaseModel):
    """DTO para el reporte de ventas diario."""
    date: str
    sales_count: int
    total: Decimal
    sales: List[Sale]

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }
        from_attributes = True


# ==================== MODELOS DE CONFIGURACIÓN ====================
# (HOMOLOGACIÓN: SocialNetwork sincronizado con frontend/src/schemas.ts)

class SocialNetwork(BaseModel):
    """Modelo de red social para BusinessInfo. Sincronizado con frontend."""
    name: str
    url: str
    icon: Optional[str] = None


class BusinessInfo(BaseModel):
    """Información del negocio."""
    name: str = "E-Commerce"
    rif: Optional[str] = None
    contact: Optional[str] = None
    social_networks: List[SocialNetwork] = Field(default_factory=list)  # TIPADO FUERTE
    logo_url: Optional[str] = None
    icon_url: Optional[str] = None
    banner_url: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.now)
    
    @validator('logo_url', 'icon_url', 'banner_url', pre=True, always=True)
    def add_host_to_url(cls, v):
        """Añade el host base a URLs relativas."""
        if v and not v.startswith('http'):
            return f"{BACKEND_URL}{v}"
        return v

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z',
            Decimal: lambda v: float(v)
        }

class Customization(BaseModel):
    primary_color: str = "#264192"
    secondary_color: str = "#ffdd00"
    accent_color: str = "#ffffff"
    font_family: str = "Poppins"
    custom_css: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.now)
    icon_products_url: Optional[str] = None
    icon_business_url: Optional[str] = None
    icon_customization_url: Optional[str] = None
    icon_finance_url: Optional[str] = None
    icon_sales_url: Optional[str] = None
    icon_users_url: Optional[str] = None
    icon_tax_url: Optional[str] = None
    
    @validator('icon_products_url', 'icon_business_url', 'icon_customization_url', 'icon_finance_url', 'icon_sales_url', 'icon_users_url', 'icon_tax_url', pre=True, always=True)
    def add_host_to_icon_url(cls, v):
        """Añade el host base a URLs relativas de iconos."""
        if v and not v.startswith('http'):
            return f"{BACKEND_URL}{v}"
        return v

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z',
            Decimal: lambda v: float(v)
        }


# ==================== MODELOS DE AUTENTICACIÓN ====================

# --- INICIO DE LA MEJORA (RBAC + Autogestión) ---

class LoginRequest(BaseModel):
    """DTO para la solicitud de login."""
    username: str
    password: str


class User(BaseEntity):
    """
    Usuario del sistema (Admin).
    REFACTOR: 'role' es ahora 'roles' (una lista) para RBAC.
    """
    username: str = Field(..., min_length=3, max_length=50)
    password_hash: str
    full_name: Optional[str] = None # Para el "Panel de Usuario"
    email: Optional[str] = Field(None, unique=True) # Para recuperación
    roles: List[str] = Field(default_factory=list) # Ej: ["admin", "sales_manager"]
    is_active: bool = True
    
    class Config:
        from_attributes = True

class UserPublic(BaseModel):
    """
    Modelo de Usuario para respuestas públicas (sin password_hash).
    """
    id: str
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    roles: List[str] = Field(default_factory=list)
    is_active: bool

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """
    DTO para la respuesta de login.
    REFACTOR: Devuelve el objeto User público, sin el hash.
    """
    access_token: str
    token_type: str = "bearer"
    user: UserPublic # Usar UserPublic en lugar de User

# --- DTOs de Intención (Gestión de Usuarios) ---

class UserCreateRequest(BaseModel):
    """DTO para que un Admin cree un nuevo usuario"""
    username: str = Field(..., min_length=3, max_length=50)
    plain_password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    email: Optional[str] = None
    roles: List[str] = Field(default_factory=list, description="Ej: ['sales', 'products']")
    is_active: bool = True

class UserUpdateRequest(BaseModel):
    """DTO para que un Admin O un usuario actualice datos (sin contraseña)"""
    full_name: Optional[str] = None
    email: Optional[str] = None
    roles: Optional[List[str]] = None # Solo un admin puede cambiar esto
    is_active: Optional[bool] = None # Solo un admin puede cambiar esto

class PasswordChangeRequest(BaseModel):
    """DTO para que un usuario cambie SU PROPIA contraseña"""
    old_password: str
    new_password: str = Field(..., min_length=8)

class AdminPasswordResetRequest(BaseModel):
    """DTO para que un Admin fuerce una nueva contraseña"""
    user_id: str
    new_password: str = Field(..., min_length=8)
    
# --- DTOs de Autogestión (Recuperación de Clave) ---

class PasswordResetToken(BaseEntity):
    """
    ¡NUEVO MODELO! Almacena el código de 6 dígitos (hasheado)
    para recuperación de contraseña.
    """
    user_id: str = Field(...)
    token_hash: str = Field(...) # Hash del código de 6 dígitos
    expires_at: datetime = Field(default_factory=lambda: datetime.now() + timedelta(minutes=15)) # 15 min de expiración
    is_used: bool = False
    
    class Config:
        from_attributes = True

class PasswordResetRequest(BaseModel):
    """DTO para SOLICITAR un código de 6 dígitos"""
    email: str
    captcha_token: str # Token de hCaptcha/reCAPTCHA

class PasswordResetValidate(BaseModel):
    """DTO para VALIDAR el código y cambiar la contraseña"""
    email: str
    token: str # El código de 6 dígitos (ej: "123456")
    new_password: str = Field(..., min_length=8)

# --- FIN DE LA MEJORA ---