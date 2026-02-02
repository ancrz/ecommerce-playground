#!/usr/bin/env python3
"""
stop.local.py - Detención Inteligente del Ecosistema (v2.0)
============================================================

FEATURES:
- Lee el archivo .lock creado por start.local.py
- Mata los procesos exactos registrados
- Fallback a detección por puerto si no hay .lock
- Limpieza del .lock al terminar

Uso:
    python stop.local.py [--force] [--backend-only] [--frontend-only]
"""

import argparse
import json
import logging
import os
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, cast

# Define SIGKILL for Windows compatibility
SIGKILL = getattr(signal, "SIGKILL", signal.SIGTERM)

# --- Configuración ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.resolve()
LOCK_FILE = PROJECT_ROOT / "data" / ".ecosystem.lock"
LOG_DIR = PROJECT_ROOT / "data" / "logs"


def cleanup_logs(keep_count: int = 5):
    """Limpia logs antiguos (rotados) manteniendo los N más recientes."""
    if not LOG_DIR.exists():
        return

    logger.info("🧹 Limpiando logs antiguos...")

    # Patrones de logs rotados
    patterns = [
        "*.????????_??????.log",  # backend.20251221_180317.log
        "*.log.*",  # client.log.1
    ]

    deleted_count = 0

    # Agrupar por 'base' para no mezclar tipos (ej: backend vs frontend)
    # Estrategia simplificada: Listar todos los rotados, agrupar por prefijo
    # Pero dado el formato, mejor iterar archivos y decidir.

    try:
        files = []
        for pat in patterns:
            files.extend(LOG_DIR.glob(pat))

        # Agrupar archivos por su prefijo (ej: "backend.", "frontend.")
        groups = {}
        for f in files:
            # backend.2025... -> backend
            # client.log.1 -> client
            parts = f.name.split(".")
            prefix = parts[0]
            if prefix not in groups:
                groups[prefix] = []
            groups[prefix].append(f)

        for prefix, file_list in groups.items():
            # Ordenar por fecha de modificación (más reciente al final)
            file_list.sort(key=lambda x: x.stat().st_mtime)

            # Si hay más de 'keep_count', borrar los antiguos
            if len(file_list) > keep_count:
                to_delete = file_list[:-keep_count]
                for f in to_delete:
                    try:
                        f.unlink()
                        logger.debug(f"   🗑️ Eliminado: {f.name}")
                        deleted_count += 1
                    except Exception as e:
                        logger.warning(f"   ⚠️ Error borrando {f.name}: {e}")

        if deleted_count > 0:
            logger.info(f"✓ Se eliminaron {deleted_count} logs antiguos.")

    except Exception as e:
        logger.warning(f"⚠️ Error durante limpieza de logs: {e}")


class LockFile:
    """Gestiona el archivo .lock para comunicación entre scripts."""

    def __init__(self, path: Path):
        self.path = path

    def read(self) -> dict[str, Any] | None:
        """Lee el archivo .lock si existe."""
        if not self.path.exists():
            return None
        try:
            with open(self.path, encoding="utf-8") as f:
                return cast(dict[str, Any], json.load(f))
        except (OSError, json.JSONDecodeError):
            return None

    def delete(self):
        """Elimina el archivo .lock."""
        if self.path.exists():
            try:
                self.path.unlink()
                logger.info(f"✓ Lock file eliminado: {self.path}")
            except Exception as e:
                logger.warning(f"⚠️ No se pudo eliminar lock file: {e}")

    def exists(self) -> bool:
        """Verifica si existe el .lock."""
        return self.path.exists()


def is_windows() -> bool:
    return sys.platform == "win32"


def load_env():
    """Carga variables de entorno desde .env."""
    env_file = PROJECT_ROOT / ".env"

    if not env_file.exists():
        return

    with open(env_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value


def is_port_in_use(port: int) -> bool:
    """Verifica si un puerto está en uso."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", port))
            return False
        except OSError:
            return True


def is_process_running(pid: int) -> bool:
    """Verifica si un proceso está corriendo."""
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False
    except SystemError:
        return False


def kill_process(pid: int, force: bool = False) -> bool:
    """Mata un proceso por PID."""
    if not is_process_running(pid):
        return True  # Ya está muerto

    try:
        if is_windows():
            # En Windows, usar taskkill
            cmd = ["taskkill"]
            if force:
                cmd.append("/F")
            cmd.extend(["/PID", str(pid), "/T"])  # /T = kill tree

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            return result.returncode == 0 or "not found" in result.stderr.lower()
        else:
            # En Unix, usar señales
            if force:
                os.kill(pid, SIGKILL)
            else:
                os.kill(pid, signal.SIGTERM)

            # Esperar a que termine
            for _ in range(10):
                if not is_process_running(pid):
                    return True
                time.sleep(0.5)

            # Si no termina, forzar
            if is_process_running(pid):
                os.kill(pid, SIGKILL)
                time.sleep(1)

            return not is_process_running(pid)

    except Exception as e:
        logger.debug(f"Error matando proceso {pid}: {e}")
        return False


def kill_by_port_windows(port: int) -> bool:
    """Mata proceso por puerto en Windows usando netstat + taskkill."""
    try:
        # Encontrar PID usando netstat
        result = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, timeout=10)

        for line in result.stdout.split("\n"):
            # Buscar líneas con nuestro puerto en estado LISTENING
            if f":{port}" in line and "LISTENING" in line:
                parts = line.split()
                if parts:
                    try:
                        pid = int(parts[-1])
                        if pid > 0:
                            logger.info(f"   Encontrado PID {pid} en puerto {port}")
                            result = subprocess.run(
                                ["taskkill", "/F", "/PID", str(pid), "/T"], capture_output=True, text=True, timeout=10
                            )
                            if result.returncode == 0:
                                return True
                    except ValueError:
                        continue

        return False

    except Exception as e:
        logger.debug(f"Error en kill_by_port_windows: {e}")
        return False


def kill_by_port_unix(port: int) -> bool:
    """Mata proceso por puerto en Unix usando lsof."""
    try:
        result = subprocess.run(["lsof", "-t", f"-i:{port}"], capture_output=True, text=True, timeout=10)

        if result.stdout.strip():
            pids = result.stdout.strip().split("\n")
            killed_any = False
            for pid_str in pids:
                try:
                    pid = int(pid_str.strip())
                    os.kill(pid, signal.SIGTERM)
                    killed_any = True
                except (ValueError, ProcessLookupError):
                    continue
            return killed_any

        return False

    except Exception as e:
        logger.debug(f"Error en kill_by_port_unix: {e}")
        return False


def stop_from_lock(lock_data: dict[str, Any], stop_backend: bool, stop_frontend: bool, force: bool) -> int:
    """Detiene procesos usando información del .lock."""
    killed = 0
    processes = lock_data.get("processes", [])
    pid_master = lock_data.get("pid_master")

    # 1. Detener servicios hijos
    for proc_info in processes:
        proc_type = proc_info.get("type", "unknown")
        pid = proc_info.get("pid")
        port = proc_info.get("port")

        # Filtrar por tipo
        if proc_type == "backend" and not stop_backend:
            continue
        if proc_type == "frontend" and not stop_frontend:
            continue

        if pid:
            logger.info(f"🛑 Deteniendo {proc_type} (PID: {pid}, Puerto: {port})")

            if kill_process(pid, force):
                logger.info(f"   ✓ {proc_type} detenido")
                killed += 1
            else:
                logger.warning("   ⚠️ No se pudo detener por PID, intentando por puerto...")

                # Fallback: matar por puerto
                if port and is_port_in_use(port):
                    kill_func = kill_by_port_windows if is_windows() else kill_by_port_unix
                    if kill_func(port):
                        logger.info(f"   ✓ {proc_type} detenido (vía puerto)")
                        killed += 1

    # 2. Detener Master (start.local.py) si estamos deteniendo todo
    if stop_backend and stop_frontend and pid_master:
        logger.info(f"🛑 Deteniendo proceso maestro (PID: {pid_master})")
        if kill_process(pid_master, force):
            logger.info("   ✓ Maestro detenido")
            # Esperar un momento a que el SO libere el lock file
            time.sleep(1)
        else:
            logger.warning("   ⚠️ No se pudo detener el maestro (¿ya cerrado?)")

    return killed


def stop_by_ports(backend_port: int, frontend_port: int, stop_backend: bool, stop_frontend: bool) -> int:
    """Fallback: detiene procesos por puerto."""
    killed = 0
    kill_func = kill_by_port_windows if is_windows() else kill_by_port_unix

    if stop_backend and is_port_in_use(backend_port):
        logger.info(f"🛑 Deteniendo proceso en puerto {backend_port} (backend)")
        if kill_func(backend_port):
            killed += 1
            logger.info("   ✓ Backend detenido")

    if stop_frontend and is_port_in_use(frontend_port):
        logger.info(f"🛑 Deteniendo proceso en puerto {frontend_port} (frontend)")
        if kill_func(frontend_port):
            killed += 1
            logger.info("   ✓ Frontend detenido")

    return killed


def verify_stopped(backend_port: int, frontend_port: int, stop_backend: bool, stop_frontend: bool) -> bool:
    """Verifica que los puertos estén libres."""
    time.sleep(2)  # Dar tiempo a que los sockets se liberen

    issues = []

    if stop_backend and is_port_in_use(backend_port):
        issues.append(f"Puerto {backend_port} (backend) aún en uso")

    if stop_frontend and is_port_in_use(frontend_port):
        issues.append(f"Puerto {frontend_port} (frontend) aún en uso")

    if issues:
        logger.warning("⚠️ Algunos puertos siguen ocupados:")
        for issue in issues:
            logger.warning(f"   - {issue}")
        logger.warning("")
        logger.warning("Esto puede ser temporal (sockets en TIME_WAIT).")
        logger.warning("Espera unos segundos e intenta de nuevo.")
        return False

    return True


def main():
    """Entry point principal."""
    parser = argparse.ArgumentParser(description="Detener servidores de desarrollo")
    parser.add_argument("--force", "-f", action="store_true", help="Forzar terminación (SIGKILL)")
    parser.add_argument("--backend-only", action="store_true", help="Solo detener backend")
    parser.add_argument("--frontend-only", action="store_true", help="Solo detener frontend")
    args = parser.parse_args()

    print("\n>>> Deteniendo farmalux-ecommerce <<<\n")

    # Limpieza de logs n-1 (Primero lo que hará)
    cleanup_logs(keep_count=3)  # Mantener 3 últimos por tipo

    # Cargar configuración
    load_env()

    backend_port = int(os.getenv("BACKEND_PORT", "8042"))
    frontend_port = int(os.getenv("FRONTEND_PORT", "5173"))

    stop_backend = not args.frontend_only
    stop_frontend = not args.backend_only

    # Leer .lock
    lock = LockFile(LOCK_FILE)
    lock_data = lock.read()

    # Verificar si hay algo que detener
    backend_running = is_port_in_use(backend_port)
    frontend_running = is_port_in_use(frontend_port)

    if not backend_running and not frontend_running and not lock_data:
        logger.info("ℹ️ El sistema no está corriendo")
        lock.delete()  # Limpiar .lock huérfano si existe
        return 0

    # Mostrar qué vamos a detener
    logger.info("Estado detectado:")
    if backend_running:
        logger.info(f"   - Backend corriendo en puerto {backend_port}")
    if frontend_running:
        logger.info(f"   - Frontend corriendo en puerto {frontend_port}")
    if lock_data:
        logger.info(f"   - Lock file encontrado: {LOCK_FILE}")
        logger.info(f"   - Iniciado: {lock_data.get('started_at', 'desconocido')}")
    logger.info("")

    killed = 0

    # Método 1: Usar información del .lock (más preciso)
    if lock_data:
        logger.info("Usando información del lock file...")
        killed = stop_from_lock(lock_data, stop_backend, stop_frontend, args.force)

    # Método 2: Fallback por puerto (si no hay lock o quedaron procesos)
    if not lock_data or not verify_stopped(backend_port, frontend_port, stop_backend, stop_frontend):
        logger.info("Usando detección por puerto...")
        killed += stop_by_ports(backend_port, frontend_port, stop_backend, stop_frontend)

    # Limpiar .lock
    lock.delete()

    # Verificar resultado final
    time.sleep(1)
    if verify_stopped(backend_port, frontend_port, stop_backend, stop_frontend):
        logger.info("")
        logger.info("✓ Todos los servicios detenidos correctamente")
        return 0
    else:
        logger.error("")
        logger.error("⚠️ Algunos puertos siguen ocupados (puede ser TIME_WAIT)")
        logger.error("   Espera 30 segundos e intenta de nuevo")
        return 1


if __name__ == "__main__":
    sys.exit(main())
