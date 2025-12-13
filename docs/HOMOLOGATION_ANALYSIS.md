# 🔍 Homologación Backend ↔ Frontend

**Análisis de dependencias, huecos lógicos y cambios en cascada.**

_Fecha: 2025-12-13_

---

## 📊 Resumen Ejecutivo

| Categoría                 | Cantidad | Prioridad |
| ------------------------- | -------- | --------- |
| Codependientes (críticos) | 4        | 🔴 ALTA   |
| Interdependientes         | 3        | 🟡 MEDIA  |
| Dependientes              | 8+       | 🟢 BAJA   |

---

## 🔴 CODEPENDIENTES (Requieren cambios simultáneos)

### 1. SocialNetworkSchema sin validación en Backend

**Frontend** (`schemas.ts` línea 167-171):

```typescript
export const SocialNetworkSchema = z.object({
  name: z.string(),
  url: z.string(),
  icon: z.string().url().optional().nullable(),
});
```

**Backend** (`base.py` línea 284):

```python
social_networks: List[Dict[str, Any]] = Field(default_factory=list)
```

**Problema**: Backend acepta cualquier estructura, Frontend espera campos específicos.

**Solución**:

```python
# Añadir en backend/models/base.py
class SocialNetwork(BaseModel):
    name: str
    url: str
    icon: Optional[str] = None

class BusinessInfo(BaseModel):
    social_networks: List[SocialNetwork] = Field(default_factory=list)
```

---

### 2. CartItem.subtotal no se serializa

**Backend** (`base.py`):

```python
class CartItem(BaseModel):
    @property
    def subtotal(self) -> Decimal:
        return (self.price * self.quantity)
```

**Problema**: `@property` no se serializa en Pydantic v2 por defecto.

**Solución**:

```python
from pydantic import computed_field

class CartItem(BaseModel):
    @computed_field
    @property
    def subtotal(self) -> Decimal:
        return (self.price * self.quantity)
```

---

### 3. Cart.currency_id/region_id: Opcional vs Requerido

**Frontend** (requerido):

```typescript
currency_id: z.string().uuid(),
region_id: z.string().uuid(),
```

**Backend** (opcional):

```python
currency_id: Optional[str] = None
region_id: Optional[str] = None
```

**Solución**: Hacer los campos requeridos en backend para flujos de venta:

```python
currency_id: str = Field(...)
region_id: str = Field(...)
```

---

### 4. Conversión de Moneda: Lógica Duplicada

**Frontend** (`App.tsx` línea 266-268):

```typescript
displayPrice = price / selectedCurrency.exchange_rate;
```

**Backend** tiene `Currency.convert_from_base()` Y endpoint `/finance/price-conversion`.

**Problema**: Lógica de negocio duplicada. Si el algoritmo cambia, hay inconsistencia.

**Solución**:

- Delegar conversión al backend usando el endpoint existente
- O garantizar que ambos usen el mismo algoritmo documentado

---

## 🟡 INTERDEPENDIENTES (Un cambio afecta al otro)

### 5. Inicialización de Carrito "Guest"

**Frontend** (`App.tsx` línea 164-169):

```typescript
const newCart = await api.createCart(
  "Invitado",  // HARDCODEADO
  "guest-id",  // HARDCODEADO
  ...
);
```

**Solución**: Crear endpoint en backend:

```python
@router.post("/guest", response_model=Cart)
async def create_guest_cart(region_id: str, currency_id: str):
    """Crea un carrito para usuario invitado"""
    return await cart_service.create_cart(
        customer_name="Invitado",
        customer_id=f"guest-{uuid.uuid4().hex[:8]}",
        region_id=region_id,
        currency_id=currency_id
    )
```

---

### 6. URLs de Imágenes Hardcodeadas

**Backend** (`base.py` línea 291-294):

```python
if v and not v.startswith('http'):
    return f"http://localhost:8000{v}"  # HARDCODEADO
```

**Solución**: Usar variable de entorno:

```python
import os
BASE_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

@validator('logo_url', pre=True)
def add_host_to_url(cls, v):
    if v and not v.startswith('http'):
        return f"{BASE_URL}{v}"
    return v
```

---

### 7. Product.final_price como @property

**Problema**: `final_price` no se serializa automáticamente.

**Solución**: Usar `@computed_field`:

```python
@computed_field
@property
def final_price(self) -> Decimal:
    if self.is_discount and self.discount_percentage > 0:
        discount = self.price * (self.discount_percentage / 100)
        return (self.price - discount).quantize(Decimal('0.01'))
    return self.price
```

---

## 🟢 DEPENDIENTES (Endpoints no usados en Frontend)

| Backend Endpoint                           | Falta en Frontend      |
| ------------------------------------------ | ---------------------- |
| `GET /products/{id}`                       | `getProductById()`     |
| `GET /finance/currencies/base`             | `getBaseCurrency()`    |
| `GET /finance/price-conversion`            | `convertPrice()`       |
| `DELETE /admin/tax/regions/{id}`           | `deleteRegion()`       |
| `PUT /admin/tax/tax-rates/{id}`            | `updateTaxRate()`      |
| `DELETE /admin/tax/tax-rates/{id}`         | `deleteTaxRate()`      |
| `GET /cart/{id}/qr`                        | `getCartQR()`          |
| `DELETE /admin/images/products/{id}/image` | `deleteProductImage()` |

---

## 📋 Cambios en Cascada

### Prioridad ALTA ⚠️

```
1. SocialNetwork Model
   backend/models/base.py → CREAR SocialNetwork class
   └── backend/services/business_service.py → VALIDAR estructura

2. CartItem.subtotal
   backend/models/base.py → AÑADIR @computed_field
   └── (Frontend OK, ya espera el campo)

3. Cart.currency_id/region_id
   backend/models/base.py → HACER requeridos
   └── (Frontend OK, ya los espera)
```

### Prioridad MEDIA 🔧

```
4. Guest Cart Endpoint
   backend/api/cart.py → CREAR /guest endpoint
   └── frontend/src/api.ts → USAR createGuestCart()
       └── frontend/src/App.tsx → LLAMAR a nuevo endpoint

5. Image URLs
   backend/models/base.py → USA os.getenv("BACKEND_URL")
   └── .env.example → AÑADIR BACKEND_URL
```

### Prioridad BAJA 📝

```
6. Funciones API faltantes
   frontend/src/api.ts → AÑADIR funciones
   └── frontend/src/admin-modules/TaxModule.tsx → USAR deleteTaxRate, etc.
```

---

## ✅ Próximos Pasos

1. **Corregir CODEPENDIENTES** (commits atómicos)
2. **Añadir funciones faltantes al API client**

---

## ✅ Cambios Realizados

### Commit: `fix: HOMOLOGATION - Backend/Frontend sync`

| #   | Archivo                   | Cambio                                                                                                        |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `.env.example`            | Puerto 8042, añadido `BACKEND_URL`                                                                            |
| 2   | `backend/models/base.py`  | `@computed_field` para `final_price`, `subtotal`, `item_count`; `SocialNetwork` model; `BACKEND_URL` dinámico |
| 3   | `backend/api/cart.py`     | Nuevo endpoint `POST /cart/guest`                                                                             |
| 4   | `frontend/src/api.ts`     | `createGuestCart()` + 7 funciones faltantes                                                                   |
| 5   | `frontend/src/App.tsx`    | Usa `createGuestCart()`                                                                                       |
| 6   | `frontend/vite.config.js` | Proxy a puerto 8042                                                                                           |

### Próximos Pasos

1. Ejecutar `python setup.py` para instalar dependencias
2. Ejecutar `python start.local.py` para verificar funcionamiento
3. Opcional: Configurar Orval para generación automática de cliente API
