# 🧪 Dry Run: Análisis de Viabilidad por Módulo

**Fecha**: 2025-12-13  
**Objetivo**: Identificar huecos lógicos y verificar viabilidad antes de iniciar el sistema.

---

## 📊 Resumen de Módulos

| Módulo         | Estado           | Huecos                 | Prioridad |
| -------------- | ---------------- | ---------------------- | --------- |
| Productos      | ✅ Viable        | Ninguno crítico        | -         |
| Finanzas       | ✅ Viable        | Ninguno crítico        | -         |
| Impuestos      | ⚠️ Viable        | Falta delete/update UI | BAJA      |
| Ventas/POS     | ✅ Viable        | Ninguno crítico        | -         |
| Usuarios/RBAC  | 🔴 Corregido     | Rutas duplicadas       | ALTA      |
| Contenido/Tema | ✅ Simplificable | Eliminar CSS custom    | MEDIA     |
| Carrito        | ✅ Viable        | Ninguno crítico        | -         |
| Autenticación  | ✅ Viable        | Ninguno crítico        | -         |

---

## 🔴 Huecos Críticos Corregidos

### 1. Rutas Duplicadas en User Admin (CORREGIDO)

**Problema**: Las rutas en `user_admin.py` tenían `/users` duplicado:

- `POST /api/admin/users/users` ← MAL
- Debería ser: `POST /api/admin/users`

**Solución aplicada**: Cambiar las rutas internas de `/users` a `/`.

```python
# ANTES
@router.post("/users", ...)

# DESPUÉS
@router.post("/", ...)
```

---

## 🟡 Huecos Menores

### 2. Módulo de Impuestos - Falta UI de Delete/Update

**Estado**: Funciones API existen pero UI no las usa:

- `deleteTaxRate()` - añadida al API client
- `updateTaxRate()` - añadida al API client
- `deleteRegion()` - añadida al API client

**Impacto**: Bajo - Admin puede desactivar en vez de eliminar.

### 3. Importaciones Incorrectas (CORREGIDO)

**Problema**: `UserManagementModule.tsx` importaba de `../../types` pero está en `admin-modules/`.

**Solución**: Cambiar a `../types`.

---

## 🟢 Módulos Sin Huecos

### Productos (`ProductsModule.tsx`)

- CRUD completo ✓
- Imágenes uploadables ✓
- Descuentos calculados ✓

### Finanzas (`FinanceModule.tsx`)

- Gestión de monedas ✓
- Tasas de cambio ✓
- Moneda base configurable ✓

### Ventas/POS (`SalesModule.tsx`)

- Cola de carritos ✓
- Completar venta ✓
- Cancelar venta ✓
- Reporte diario ✓
- Cierre de día ✓

### Autenticación

- Login/Logout ✓
- JWT con roles ✓
- Recuperación de contraseña ✓
- Cambio de contraseña ✓
- RBAC en endpoints ✓

---

## 🛠️ Simplificación de Estilos

### Cambios Realizados:

1. **TailwindCSS instalado** con plugins:

   - `tailwindcss`
   - `postcss`
   - `autoprefixer`
   - `@tailwindcss/forms`

2. **index.css refactorizado** para usar:

   - Directivas `@tailwind base/components/utilities`
   - `@layer` para organización
   - Custom properties para colores dinámicos

3. **Colores dinámicos mantenidos**:

   ```css
   :root {
     --color-primary: #264192;
     --color-secondary: #ffdd00;
     --color-accent: #ffffff;
   }
   ```

   El módulo de Customization sigue pudiendo cambiar colores via `App.tsx`.

4. **ThemeModule simplificado**:
   - Solo cambia: isotipo, imagotipo, colores base
   - Ya no necesita CSS custom (TailwindCSS provee todo)

---

## 📋 Flujo de Datos por Módulo

### Productos

```
Frontend           →  API              →  Backend Service  →  DB
ProductsModule.tsx → /api/products    → ProductService    → products table
                     /api/admin/images → ImageService      → uploads/
```

### Usuarios

```
Frontend                →  API                  →  Backend Service  →  DB
UserManagementModule   → /api/admin/users      → UserService       → users table
                                                                     → password_reset_tokens
```

### Ventas

```
Frontend       →  API                →  Backend         →  DB
SalesModule   → /api/cart           → CartService      → carts table
              → /api/admin/sales    → SalesService     → sales table
                                    → TaxService       → (in-memory calc)
```

### Finanzas

```
Frontend        →  API              →  Backend         →  DB
FinanceModule  → /api/finance      → FinanceService   → currencies table
TaxModule      → /api/admin/tax    → TaxService       → fiscal_regions table
                                                       → tax_rates table
```

---

## ✅ Checklist Pre-Ejecución

- [x] Variables de entorno configuradas (`.env`)
- [x] TailwindCSS instalado y configurado
- [x] Rutas de User Admin corregidas
- [x] Importaciones de tipos corregidas
- [x] Funciones API faltantes añadidas
- [ ] `npm install` en frontend
- [ ] `pip install` en backend
- [ ] Base de datos inicializada
- [ ] Datos de prueba cargados

---

## 🚀 Comando de Inicio

```bash
# 1. Configurar ambiente
python setup.py

# 2. Iniciar servidores
python start.local.py
```

El sistema estará disponible en:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8042
- Swagger Docs: http://localhost:8042/docs
