# Use Case: Authentication & RBAC

## 1. Contexto

El sistema utiliza autenticación basada en JWT (tokens) con un modelo de Control de Acceso Basado en Roles (RBAC).
El frontend gestiona la sesión mediante `localStorage` y un contexto global (`App.tsx`).

## 2. Flujo de Login

1.  **Frontend**: `LoginModal` solicita `apiLogin(username, password)`.
2.  **Backend**: `POST /api/auth/login`. Valida credenciales hash PBKDF2.
3.  **Respuesta**: Devuelve `access_token` y objeto `user` con roles.
4.  **Almacenamiento**: `App.tsx` guarda token y user en `localStorage`.
5.  **Estado Global**: Se actualiza `user` en el contexto.

## 3. Manejo de Invitados (Guests)

- Usuarios no logueados navegan libremente.
- **Recursos Globales**: `/customization`, `/regions`, `/currencies` deben ser PÚBLICOS (GET) para permitir renderizado del sitio y creación de carritos de invitado.
- **Carritos**: `POST /api/cart/guest` crea un carrito temporal en `localStorage`.

## 4. Protección de Rutas (RBAC)

### Backend Strategy

- **Endpoints de Lectura (GET)**: Generalmente públicos si afectan a la tienda (precios, productos, contenido visual).
- **Endpoints de Escritura (POST/PUT/DELETE)**: Protegidos estrictamente.
  - Ej: `customization.py` -> `GET /` (Público), `PUT /` (Content Manager).
  - Ej: `tax_admin.py` -> `GET /regions` (Público), `POST /regions` (Finance Manager).
- **Main.py**: NO DEBE aplicar dependencias globales a routers mixtos (lectura pública + escritura privada). Las dependencias se aplican a nivel de función (`@router.post(...) dependencies=[...]`).

### Frontend Strategy

- `loadInitialData` intenta cargar configuración global. Si falla (401), degrada la experiencia pero no rompe la app.
- `ProtectedAdminRoute`: Verifica `user.roles.length > 0` antes de renderizar `/admin/*`.

## 5. Solución de Problemas Comunes (RCA Relacionados)

- **401 en Carga Inicial**: Verificar que `/api/admin/customization` y `/api/admin/tax/regions` no tengan dependencias globales restrictivas en `backend/main.py`.
- **Login Fails**: Verificar hashing en `seed_dummies.py` vs `user_service.py` (deben usar PBKDF2).
- **Password form warning**: `LoginModal` debe usar `<form>` nativo.

## 6. Referencias

- `backend/main.py`: Registro de routers.
- `frontend/src/api.ts`: Cliente HTTP con inyección de Token.
- `backend/utils/auth.py`: Lógica de JWT y Roles.
