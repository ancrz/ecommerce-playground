# 🛠️ Sistema de Scripts Inteligentes

## 📋 Resumen

El ecosistema farmalux-ecommerce incluye un sistema de scripts Python inteligentes que:

1. **Detectan automáticamente** el SO y las herramientas instaladas
2. **Instalan dependencias** si es la primera ejecución
3. **Comunican entre sí** usando un archivo `.lock` para rastrear PIDs
4. **Manejan errores** de forma robusta con fallbacks

---

## 🚀 Comandos Principales

### Entry Point Unificado

```bash
python -m scripts.run <comando>
```

| Comando   | Descripción                                |
| --------- | ------------------------------------------ |
| `setup`   | Configurar ambiente desde cero (venv, npm) |
| `start`   | Iniciar backend + frontend                 |
| `stop`    | Detener todos los servicios                |
| `restart` | Detener e iniciar                          |
| `status`  | Ver estado visual del sistema              |
| `regen`   | Regenerar cliente API (OpenAPI → Zod)      |
| `migrate` | Ejecutar migraciones de BD                 |
| `seed`    | Poblar BD con datos de prueba              |

### Comandos Directos

```bash
# Iniciar (con opciones)
python start.local.py [--force] [--backend-only] [--frontend-only]

# Detener
python stop.local.py [--force] [--backend-only] [--frontend-only]

# Ver estado
python -m scripts.status
```

---

## 🔧 Arquitectura

### Archivo Lock (`data/.ecosystem.lock`)

El script `start.local.py` crea un archivo JSON con:

```json
{
  "started_at": "2024-12-13T16:30:00",
  "updated_at": "2024-12-13T16:30:05",
  "hostname": "DESKTOP-XXX",
  "pid_master": 12345,
  "processes": [
    {
      "type": "backend",
      "pid": 12346,
      "port": 8042,
      "cmd": ["python", "-m", "uvicorn", "..."]
    },
    {
      "type": "frontend",
      "pid": 12347,
      "port": 5173,
      "cmd": ["npm", "run", "dev"]
    }
  ],
  "backend_port": 8042,
  "frontend_port": 5173
}
```

El script `stop.local.py` lee este archivo para:

1. Obtener los PIDs exactos a matar
2. Matar procesos con `SIGTERM` (o `taskkill` en Windows)
3. Eliminar el `.lock` al terminar

### Fallback por Puerto

Si no existe `.lock` o los PIDs no responden:

1. Detectar procesos por puerto usando `netstat`/`lsof`
2. Matar procesos encontrados

---

## 🔍 Detección de Sistema

El `SystemDetector` detecta:

| Elemento     | Windows              | Linux/Mac               |
| ------------ | -------------------- | ----------------------- |
| Python 3.11+ | `py -3.11`, `python` | `python3.11`, `python3` |
| Node.js      | `node --version`     | `node --version`        |
| npm          | `npm.cmd`            | `npm`                   |

### Bootstrap Automático

Si es la primera ejecución:

1. **Crear venv**: `python -m venv .venv`
2. **Instalar pip**: `pip install --upgrade pip`
3. **Instalar proyecto**: `pip install -e .`
4. **Instalar frontend**: `npm install` (en `frontend/`)

---

## 📝 Logs

Los servicios escriben logs en:

```
data/
├── logs/
│   ├── backend.log    # Logs de uvicorn
│   └── frontend.log   # Logs de vite
└── .ecosystem.lock    # Estado del sistema
```

---

## 🔄 Regeneración de API

Cuando cambias el backend (modelos, endpoints):

```bash
python -m scripts.run regen
```

Esto:

1. Verifica que el backend esté corriendo (o lo inicia temporalmente)
2. Descarga `GET /openapi.json`
3. Guarda en `docs/openapi.json`
4. Genera `frontend/src/types.generated.ts` con schemas Zod

### Migraciones de BD

```bash
# Aplicar migraciones pendientes
python -m scripts.run migrate

# Generar nueva migración
python -m scripts.migrate --generate -m "descripcion"

# Revertir última migración
python -m scripts.migrate --rollback
```

**Nota**: Este proyecto usa SQLite con chunks separados. Las tablas se crean automáticamente en el startup del backend, por lo que Alembic puede no ser necesario.

---

## ⚠️ Troubleshooting

### Puerto ocupado pero proceso no existe

Puede ser un socket en estado `TIME_WAIT`. Espera 30 segundos e intenta de nuevo.

```powershell
# Ver qué hay en el puerto (Windows)
netstat -ano | findstr :8042

# Ver si el proceso existe
Get-Process -Id <PID> -ErrorAction SilentlyContinue
```

### Procesos zombies de uvicorn

Uvicorn usa multiprocessing. Si `stop.local.py` no mata todos:

```powershell
# Windows: matar todos los python
taskkill /F /IM python.exe /T

# O matar por puerto
Get-NetTCPConnection -LocalPort 8042 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Frontend no compila (TailwindCSS)

Asegúrate de tener el plugin correcto:

```bash
cd frontend
npm install -D @tailwindcss/postcss
```

Y que `postcss.config.js` use `@tailwindcss/postcss`:

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
```

---

## 📊 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                          start.local.py                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Load .env                                                    │
│  2. Check existing .lock → if exists & --force → run stop       │
│  3. SystemDetector.get_report()                                 │
│  4. run_bootstrap() → create venv, npm install                  │
│  5. start_backend() → spawn uvicorn, write .lock                │
│  6. start_frontend() → spawn vite, update .lock                 │
│  7. wait_for_health() → GET /api/products                       │
│  8. Wait for Ctrl+C → cleanup_and_exit()                        │
└─────────────────────────────────────────────────────────────────┘
                              ↕ .ecosystem.lock
┌─────────────────────────────────────────────────────────────────┐
│                          stop.local.py                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Load .env                                                    │
│  2. Read .lock → get PIDs                                        │
│  3. stop_from_lock() → kill by PID                              │
│  4. verify_stopped() → check ports                              │
│  5. Fallback: stop_by_ports() → netstat + taskkill              │
│  6. Delete .lock                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Extensibilidad

Para añadir un nuevo servicio (ej: worker de tareas):

1. Añadir función `start_worker()` en `start.local.py`
2. Registrar en el array `processes`
3. El `.lock` lo rastreará automáticamente
4. `stop.local.py` lo matará al leer el `.lock`

---

## ✅ Checklist de Primer Uso

```
[ ] Python 3.11+ instalado
[ ] Node.js 18+ instalado
[ ] Ejecutar: python start.local.py
    → Creará .venv automáticamente
    → Instalará dependencias
    → Iniciará servidores
[ ] Abrir http://localhost:5173
```
