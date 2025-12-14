# Documentación de Cambios Técnicos - Fase 3 (Observabilidad y Arquitectura)

## 1. Observabilidad y Logging

Se ha implementado un sistema robusto de logging centralizado para mejorar la depuración tanto en desarrollo como en producción simulada.

### Backend (Logs Granulares)

- **Estructura:** Los logs se separan por módulo funcional en `data/logs/` (ej. `auth.log`, `products.log`, `finance.log`).
- **Rotación Automática:** Implementada rotación por tamaño (`Max 5MB`, 3 backups) usando `RotatingFileHandler`.
- **Configuración:** Gestionada en `backend/utils/logging.py`.

### Frontend (Logger Remoto)

- **Intercepción:** Se ha creado un interceptor (`frontend/src/logger.ts`) que captura `console.log`, `warn` y `error`.
- **Transmisión:** Los logs del navegador se envían al backend vía `navigator.sendBeacon` (o fetch keepalive) al endpoint `/api/client-logs`.
- **Almacenamiento:** El backend los guarda en `data/logs/client.log`.

### Rotación de Sesión (Startup)

- El script `start.local.py` ahora rota los archivos principales (`backend.log`, `frontend.log`) al inicio de cada ejecución.
- **Formato:** Mueve el log anterior a `*.{TIMESTAMP}.log` para preservar el historial de sesiones pasadas.

---

## 2. Arquitectura Frontend: React Query

Para estandarizar la gestión de estado asíncrono y la invalidación de caché (evitando recargas manuales o datos obsoletos), se ha integrado **TanStack Query (React Query)**.

- **Configuración:** `QueryClient` configurado en `frontend/src/lib/react-query.ts` y provisto en `main.tsx`.
- **Implementación Piloto:** El módulo `UserManagementModule` ha sido refactorizado para usar `useQuery` (lectura) y `useMutation` (escritura).
- **Beneficio:** Al crear/editar un usuario, `invalidateQueries(['users'])` refresca la tabla automáticamente sin necesidad de `loadUsers()` manual.

---

## 3. Mejoras de UI/UX

- **Modal Glassmorphism:** El componente `<Modal>` ahora utiliza `backdrop-blur-sm` y un fondo semitransparente oscuro (`bg-black/40`) para un efecto visual moderno, eliminando el "negro plano" anterior.
- **Formularios:** Se corrigieron advertencias de React sobre inputs no controlados inicializando valores con Defaults seguros.

---

## 4. Automatización del Ecosistema

- **Regeneración Completa:** El script `scripts/regenerate.py` ahora incluye el paso de **Seeding** (`seed_dummies.py`) al final del proceso.
  - Comando único: `python scripts/regenerate.py` (Resetea DB, Genera Tipos, Puebla Datos).
- **Scripts:** Se mejoró la robustez de `stop.local.py` para Windows (manejo de SystemError).

---

## 5. Próximos Pasos Recomendados

- Extender el refactor de **React Query** a los módulos restantes (`Products`, `Finance`, `Tax`, `Sales`) siguiendo el patrón de `UserManagementModule`.
- Implementar limpieza periódica de logs antiguos para evitar consumo excesivo de disco por la rotación basada en timestamps.
