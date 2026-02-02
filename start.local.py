"""
start.local.py - Inicio Inteligente del Ecosistema (v2.0)
==========================================================

FEATURES:
- Sistema de .lock para comunicación con stop.local.py
- Detección inteligente de SO y dependencias
- Bootstrap automático si es primera ejecución
- Health checks con reintentos
- Logging estructurado

Uso:
    python start.local.py [--skip-migrations] [--backend-only] [--frontend-only] [--force]
"""

import argparse
import json
import logging
import os
import platform
import shutil
import signal
import socket
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, TextIO, cast

# Import locking modules based on platform
if sys.platform == "win32":
    import msvcrt
# fcntl is imported locally in methods for Linux/Unix to avoid static analysis type conflicts

# --- Configuración ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.resolve()
LOCK_FILE = PROJECT_ROOT / "data" / ".ecosystem.lock"
VENV_PATH = PROJECT_ROOT / ".venv"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
LOG_DIR = PROJECT_ROOT / "data" / "logs"


def sanitize_logs():
    """Sanea (trunca) los logs principales para iniciar con traza limpia."""
    if not LOG_DIR.exists():
        return

    logger.info("🧹 Saneando logs principales...")

    # Buscar archivos .log que NO sean rotados (sin timestamps ni números al final)
    # Criterio: terminar en .log y no tener punto numérico intermedio obvio.
    # Simple: *.log
    try:
        count = 0
        for log_file in LOG_DIR.glob("*.log"):
            # Excluir rotados si se escapan al pattern (aunque *.log suele ser el principal)
            # Backend rote: name.TIMESTAMP.log -> no termina en .log
            # Pero cuidado con name.log.1
            if log_file.is_file():
                try:
                    # Truncar archivo
                    with open(log_file, "w", encoding="utf-8") as f:
                        f.write("")  # Vaciar
                    count += 1
                except Exception as e:
                    logger.warning(f"   ⚠️ No se pudo sanear {log_file.name}: {e}")

        if count > 0:
            logger.info(f"✓ {count} logs saneados (inician vacíos).")

    except Exception:
        pass


class CrossPlatformLock:
    """Implementación de bloqueo de archivos multiplataforma."""

    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.file_handle: TextIO | None = None
        self.is_locked = False

    def acquire(self) -> bool:
        """Intenta adquirir el lock de forma exclusiva (no bloqueante)."""
        if self.is_locked:
            return True

        try:
            # Asegurar que el directorio existe
            self.file_path.parent.mkdir(parents=True, exist_ok=True)

            # Abrir archivo en modo append/create
            self.file_handle = open(self.file_path, "a+")

            if sys.platform == "win32":
                if self.file_handle:
                    msvcrt.locking(self.file_handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                # Linux/Unix: fcntl.flock
                # LOCK_EX: Exclusive, LOCK_NB: Non-blocking
                if self.file_handle:
                    import fcntl  # type: ignore

                    fcntl.flock(self.file_handle, fcntl.LOCK_EX | fcntl.LOCK_NB)  # type: ignore

            self.is_locked = True
            return True

        except (OSError, PermissionError):
            if self.file_handle:
                try:
                    self.file_handle.close()
                except Exception:
                    pass
                self.file_handle = None
            return False

    def release(self):
        """Libera el lock."""
        if self.file_handle:
            try:
                if sys.platform == "win32":
                    msvcrt.locking(self.file_handle.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    import fcntl  # type: ignore

                    fcntl.flock(self.file_handle, fcntl.LOCK_UN)  # type: ignore
                self.file_handle.close()
            except Exception as e:
                logger.debug(f"Error liberando lock: {e}")
            finally:
                self.file_handle = None
                self.is_locked = False

    def write_data(self, data: dict[str, Any]):
        """Escribe datos al archivo lock (requiere tener el lock)."""
        if not self.is_locked or not self.file_handle:
            logger.error("Intento de escribir sin tener el lock")
            return

        try:
            self.file_handle.seek(0)
            self.file_handle.truncate()
            json.dump(data, self.file_handle, indent=2)
            self.file_handle.flush()
            if platform.system().lower() != "windows":
                os.fsync(self.file_handle.fileno())
        except Exception as e:
            logger.error(f"Error escribiendo datos al lock: {e}")


class LockFile:
    """Gestiona el archivo .lock de alto nivel."""

    def __init__(self, path: Path):
        self.path = path
        self.locker = CrossPlatformLock(path)

    def acquire(self) -> bool:
        return self.locker.acquire()

    def release(self):
        self.locker.release()
        # Opcional: Eliminar el archivo al salir
        # En sistemas de lock robustos, a veces se deja el archivo vacío
        # Pero aquí lo borramos para limpiar
        if self.path.exists():
            try:
                self.path.unlink()
            except OSError:
                pass  # Puede fallar si hay race condition, no es crítico

    def read(self) -> dict[str, Any] | None:
        """Lee el contenido sin adquirir lock (solo lectura)."""
        if not self.path.exists():
            return None
        try:
            with open(self.path, encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return None
                return cast(dict[str, Any], json.loads(content))
        except (OSError, json.JSONDecodeError):
            return None

    def write(self, data: dict[str, Any]):
        self.locker.write_data(data)


class SystemDetector:
    """Detecta el sistema operativo y herramientas instaladas."""

    def __init__(self):
        self.os_type: str = platform.system().lower()  # 'windows', 'linux', 'darwin'
        self.os_version: str = platform.version()
        self.python_version: str = platform.python_version()

    def is_windows(self) -> bool:
        return bool(self.os_type == "windows")

    def is_linux(self) -> bool:
        return bool(self.os_type == "linux")

    def is_mac(self) -> bool:
        return bool(self.os_type == "darwin")

    def find_python(self) -> str | None:
        """Encuentra el ejecutable de Python 3.11+."""
        candidates = []

        # Primero verificar venv
        venv_python = VENV_PATH / ("Scripts" if self.is_windows() else "bin") / "python"
        if self.is_windows():
            venv_python = venv_python.with_suffix(".exe")
        if venv_python.exists():
            return str(venv_python)

        # Buscar en el sistema
        if self.is_windows():
            candidates = [
                "py -3.11",
                "py -3.12",
                "py -3",
                "python",
                "python3",
            ]
        else:
            candidates = [
                "python3.11",
                "python3.12",
                "python3",
                "python",
            ]

        for cmd in candidates:
            try:
                parts = cmd.split()
                result = subprocess.run(parts + ["--version"], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    version_str = result.stdout.strip()
                    # Verificar que sea 3.11+
                    if "3.11" in version_str or "3.12" in version_str or "3.13" in version_str:
                        return cmd
            except Exception:
                continue

        return None

    def find_node(self) -> str | None:
        """Encuentra el ejecutable de Node.js."""
        cmd = "node"
        try:
            result = subprocess.run([cmd, "--version"], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return cmd
        except Exception:
            pass
        return None

    def find_npm(self) -> str | None:
        """Encuentra npm."""
        cmd = "npm.cmd" if self.is_windows() else "npm"
        try:
            result = subprocess.run([cmd, "--version"], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return cmd
        except Exception:
            pass
        return None

    def get_report(self) -> dict[str, Any]:
        """Genera un reporte del sistema."""
        return {
            "os": self.os_type,
            "os_version": self.os_version,
            "python_version": self.python_version,
            "python_cmd": self.find_python(),
            "node_cmd": self.find_node(),
            "npm_cmd": self.find_npm(),
            "venv_exists": VENV_PATH.exists(),
            "node_modules_exists": (FRONTEND_DIR / "node_modules").exists(),
        }


def load_env():
    """Carga variables de entorno desde .env."""
    env_file = PROJECT_ROOT / ".env"

    if not env_file.exists():
        env_example = PROJECT_ROOT / ".env.example"
        if env_example.exists():
            shutil.copy(env_example, env_file)
            logger.info("✓ Archivo .env creado desde .env.example")

    if env_file.exists():
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key and key not in os.environ:
                        os.environ[key] = value


def is_port_available(port: int) -> bool:
    """Verifica si un puerto está disponible (no en uso)."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False


def wait_for_port(port: int, timeout: int = 30) -> bool:
    """Espera hasta que un puerto esté en uso (servicio iniciado)."""
    start = time.time()
    while time.time() - start < timeout:
        if not is_port_available(port):
            return True
        time.sleep(0.5)
    return False


def check_health(port: int, path: str = "/api/products", timeout: int = 30) -> bool:
    """Verifica que un servicio responda correctamente."""
    import urllib.request

    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(f"http://localhost:{port}{path}", timeout=2) as response:
                if response.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False


def run_bootstrap(detector: SystemDetector) -> bool:
    """Ejecuta el bootstrap si es necesario."""
    report = detector.get_report()

    logger.info("🔍 Verificando sistema...")

    # Verificar Python
    if not report["python_cmd"]:
        logger.error("❌ Python 3.11+ no encontrado")
        if detector.is_windows():
            logger.error("   Instala desde: https://www.python.org/downloads/")
            logger.error("   O usa: winget install Python.Python.3.11")
        else:
            logger.error("   Instala con: sudo apt install python3.11 (Ubuntu)")
            logger.error("   O: brew install python@3.11 (Mac)")
        return False

    # Verificar Node.js
    if not report["node_cmd"]:
        logger.error("❌ Node.js no encontrado")
        if detector.is_windows():
            logger.error("   Instala desde: https://nodejs.org/")
            logger.error("   O usa: winget install OpenJS.NodeJS.LTS")
        else:
            logger.error("   Instala con: sudo apt install nodejs npm (Ubuntu)")
            logger.error("   O: brew install node (Mac)")
        return False

    logger.info(f"✓ Python: {report['python_cmd']}")
    logger.info(f"✓ Node: {report['node_cmd']}")

    # Verificar venv
    if not report["venv_exists"]:
        logger.info("📦 Creando entorno virtual...")
        python_cmd = report["python_cmd"]
        cmd = python_cmd.split() + ["-m", "venv", str(VENV_PATH)]
        result = subprocess.run(cmd, cwd=PROJECT_ROOT)
        if result.returncode != 0:
            logger.error("❌ Error creando entorno virtual")
            return False
        logger.info("✓ Entorno virtual creado")

        # Instalar dependencias
        logger.info("📦 Instalando dependencias de Python...")
        pip_cmd = str(VENV_PATH / ("Scripts" if detector.is_windows() else "bin") / "pip")
        if detector.is_windows():
            pip_cmd += ".exe"

        subprocess.run([pip_cmd, "install", "--upgrade", "pip"], cwd=PROJECT_ROOT)
        subprocess.run([pip_cmd, "install", "-e", "."], cwd=PROJECT_ROOT)

    # Verificar node_modules
    if not report["node_modules_exists"]:
        logger.info("📦 Instalando dependencias de Node.js...")
        npm_cmd = report["npm_cmd"]
        result = subprocess.run([npm_cmd, "install"], cwd=FRONTEND_DIR)
        if result.returncode != 0:
            logger.error("❌ Error instalando dependencias de Node.js")
            return False
        logger.info("✓ Dependencias de Node.js instaladas")

    return True


def rotate_log_file(file_path: Path):
    """Rota un archivo de log usando timestamp."""
    if file_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        # Formato: backend.20251213_191200.log
        backup = file_path.with_name(f"{file_path.stem}.{timestamp}{file_path.suffix}")
        try:
            # Rename puede fallar en Windows si el archivo está abierto (locked)
            # Pero start.local.py asume que si inicia, el anterior ya murió.
            # Si falla (WinError 32), intentamos ignorar.
            try:
                file_path.rename(backup)
                logger.debug(f"📜 Log rotado: {file_path.name} -> {backup.name}")
            except OSError:
                # Si está bloqueado, no podemos rotarlo (probablemente proceso zombie).
                pass
        except Exception as e:
            logger.warning(f"⚠️ No se pudo rotar {file_path.name}: {e}")


def start_backend(detector: SystemDetector) -> dict[str, Any] | None:
    """Inicia el servidor backend."""
    backend_port = int(os.getenv("BACKEND_PORT", "8042"))

    if not is_port_available(backend_port):
        logger.info(f"ℹ️ Puerto {backend_port} ya está en uso (backend probablemente corriendo)")
        return None

    python = str(VENV_PATH / ("Scripts" if detector.is_windows() else "bin") / "python")
    if detector.is_windows():
        python += ".exe"

    cmd = [python, "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", str(backend_port), "--reload"]

    logger.info(f"🚀 Iniciando Backend en http://localhost:{backend_port}")

    # Crear flags para Windows
    creation_flags = 0
    if detector.is_windows():
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP

    # Crear archivo de log para el backend
    log_dir = PROJECT_ROOT / "data" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    # Rotar log anterior
    log_path = log_dir / "backend.log"
    rotate_log_file(log_path)

    log_file = open(log_path, "a", encoding="utf-8")

    proc = subprocess.Popen(
        cmd,
        cwd=PROJECT_ROOT,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        creationflags=creation_flags,
    )

    # Esperar a que el puerto esté en uso
    if wait_for_port(backend_port, timeout=15):
        logger.info(f"✓ Backend iniciado (PID: {proc.pid})")
        return {
            "type": "backend",
            "pid": proc.pid,
            "port": backend_port,
            "cmd": cmd,
        }
    else:
        logger.error("❌ Backend no inició correctamente")
        proc.terminate()
        return None


def start_frontend(detector: SystemDetector) -> dict[str, Any] | None:
    """Inicia el servidor frontend."""
    frontend_port = int(os.getenv("FRONTEND_PORT", "5173"))

    if not is_port_available(frontend_port):
        logger.info(f"ℹ️ Puerto {frontend_port} ya está en uso (frontend probablemente corriendo)")
        return None

    npm = "npm.cmd" if detector.is_windows() else "npm"

    cmd = [npm, "run", "dev"]

    logger.info(f"🚀 Iniciando Frontend en http://localhost:{frontend_port}")

    creation_flags = 0
    if detector.is_windows():
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP

    # Crear archivo de log para el frontend
    log_dir = PROJECT_ROOT / "data" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    # Rotar log anterior
    log_path = log_dir / "frontend.log"
    rotate_log_file(log_path)

    log_file = open(log_path, "a", encoding="utf-8")

    proc = subprocess.Popen(
        cmd,
        cwd=FRONTEND_DIR,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        creationflags=creation_flags,
    )

    # Esperar a que el puerto esté en uso
    if wait_for_port(frontend_port, timeout=15):
        logger.info(f"✓ Frontend iniciado (PID: {proc.pid})")
        return {
            "type": "frontend",
            "pid": proc.pid,
            "port": frontend_port,
            "cmd": cmd,
        }
    else:
        logger.error("❌ Frontend no inició correctamente")
        proc.terminate()
        return None


def cleanup_and_exit(lock: LockFile, processes: list[dict], exit_code: int = 0):
    """Limpia recursos y termina."""
    logger.info("\n🛑 Deteniendo servicios...")

    for proc_info in processes:
        try:
            os.kill(proc_info["pid"], signal.SIGTERM)
            logger.info(f"   Detenido {proc_info['type']} (PID: {proc_info['pid']})")
        except (ProcessLookupError, OSError):
            pass

    lock.release()
    sys.exit(exit_code)


def signal_handler(signum, frame, lock: LockFile, processes: list[dict]):
    """Maneja señales de terminación."""
    cleanup_and_exit(lock, processes, 0)


def main():
    """Entry point principal."""
    parser = argparse.ArgumentParser(description="Iniciar servidores de desarrollo")
    parser.add_argument("--skip-migrations", action="store_true", help="Saltar migraciones de BD")
    parser.add_argument("--backend-only", action="store_true", help="Solo iniciar backend")
    parser.add_argument("--frontend-only", action="store_true", help="Solo iniciar frontend")
    parser.add_argument("--force", "-f", action="store_true", help="Forzar reinicio si ya está corriendo")
    parser.add_argument("--no-bootstrap", action="store_true", help="No ejecutar bootstrap automático")
    parser.add_argument("--no-watch", action="store_true", help="Deshabilitar watcher automático")
    args = parser.parse_args()

    print("\n>>> Iniciando ecommerce-playground <<<\n")

    # Cargar configuración
    load_env()

    # Inicializar componentes
    detector = SystemDetector()
    lock = LockFile(LOCK_FILE)
    processes: list[dict] = []

    # Intentar adquirir el lock
    if not lock.acquire():
        # Si falla el acquire, es que otra instancia tiene el archivo bloqueado.
        # Leemos el contenido para informar.
        existing = lock.read()
        logger.info("⚠️ El sistema YA está corriendo (Lock activo).")
        if existing:
            logger.info(f"   Iniciado: {existing.get('started_at', 'desconocido')}")
            logger.info(f"   PID Master: {existing.get('pid_master', 'desconocido')}")

        if args.force:
            logger.warning("Fuerza solicitada, pero el archivo está bloqueado por el sistema operativo.")
            logger.warning("Intenta detener la instancia anterior con 'stop.local.py' o manualmente.")
        return 1

    # (La lógica de 'Force' antigua se elimina porque con file locking
    #  no podemos forzar si el archivo está en uso real.
    #  Si es un zombie, acquire() funcionará y lo sobrescribirá automáticamente).
    pass

    # Bootstrap si es necesario
    if not args.no_bootstrap:
        if not run_bootstrap(detector):
            return 1

    # Registrar manejador de señales
    import functools

    handler = functools.partial(signal_handler, lock=lock, processes=processes)
    signal.signal(signal.SIGINT, handler)
    signal.signal(signal.SIGTERM, handler)
    if detector.is_windows():
        try:
            signal.signal(signal.SIGBREAK, handler)
        except AttributeError:
            pass

    # Iniciar servicios

    # Iniciar servicios
    sanitize_logs()

    if not args.frontend_only:
        backend_info = start_backend(detector)
        if backend_info:
            processes.append(backend_info)

    if not args.backend_only:
        frontend_info = start_frontend(detector)
        if frontend_info:
            processes.append(frontend_info)

    # Iniciar Watcher (si no se deshabilita)
    if not args.no_watch and not args.frontend_only and not args.backend_only:
        watch_script = PROJECT_ROOT / "scripts" / "watch.py"
        if watch_script.exists():
            logger.info("👀 Iniciando Watcher de cambios...")
            python = detector.find_python()

            # Flags para nueva ventana en Windows (para que se vea el output del watcher)
            creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if detector.is_windows() else 0

            # En Windows queremos ver el watcher en consola, pero si estamos en start.local podemos
            # simplemente lanzarlo. Para simplificar y mejorar la DX, sería ideal tenerlo visible.
            # Por ahora lo lanzamos como proceso background y sus logs irán a archivo o consola compartida.

            cmd = [python, "-m", "scripts.watch"]

            # Redirigir log para no mezclar outputs si no es nueva ventana
            log_dir = PROJECT_ROOT / "data" / "logs"
            log_dir.mkdir(parents=True, exist_ok=True)
            log_file = open(log_dir / "watcher.log", "a", encoding="utf-8")

            proc = subprocess.Popen(
                cmd, cwd=PROJECT_ROOT, stdout=log_file, stderr=subprocess.STDOUT, creationflags=creation_flags
            )

            processes.append(
                {
                    "type": "watcher",
                    "pid": proc.pid,
                    "port": 0,  # No usa puerto
                    "cmd": cmd,
                }
            )
            logger.info(f"✓ Watcher activado (PID: {proc.pid}) - Logs en data/logs/watcher.log")

    if not processes:
        logger.info("\nℹ️ No se iniciaron servicios nuevos (ya estaban corriendo)")
        return 0

    # Guardar .lock
    lock.write(
        {
            "started_at": datetime.now().isoformat(),
            "processes": processes,
            "backend_port": int(os.getenv("BACKEND_PORT", "8042")),
            "frontend_port": int(os.getenv("FRONTEND_PORT", "5173")),
            "pid_master": os.getpid(),
        }
    )

    # Health checks
    backend_port = int(os.getenv("BACKEND_PORT", "8042"))
    if not args.frontend_only:
        logger.info("⏳ Verificando salud del backend...")
        if check_health(backend_port, timeout=15):
            logger.info("✓ Backend respondiendo correctamente")
        else:
            logger.warning("⚠️ Backend no responde a health check (puede estar iniciando)")

    # Mostrar información
    frontend_port = int(os.getenv("FRONTEND_PORT", "5173"))

    logger.info("")
    logger.info("=" * 60)
    logger.info("  Servidores en ejecución - Presiona Ctrl+C para detener")
    logger.info("=" * 60)
    logger.info(f"  Backend:  http://localhost:{backend_port}")
    logger.info(f"  Frontend: http://localhost:{frontend_port}")
    logger.info(f"  API Docs: http://localhost:{backend_port}/docs")
    logger.info("")
    logger.info(f"  Lock file: {LOCK_FILE}")
    logger.info("=" * 60)

    # Esperar
    try:
        while True:
            time.sleep(1)
            # Verificar que los procesos sigan vivos
            for proc_info in processes:
                try:
                    os.kill(proc_info["pid"], 0)  # Test if process exists
                except OSError:
                    logger.warning(f"⚠️ Proceso {proc_info['type']} (PID: {proc_info['pid']}) terminó inesperadamente")
    except KeyboardInterrupt:
        cleanup_and_exit(lock, processes, 0)

    return 0


if __name__ == "__main__":
    sys.exit(main())
