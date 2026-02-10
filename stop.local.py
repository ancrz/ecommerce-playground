#!/usr/bin/env python3
"""
stop.local.py - Detención Inteligente del Ecosistema (v3.0 - Concurrente)
===========================================================================

FEATURES:
- Lee el archivo .lock creado por start.local.py
- Mata procesos en PARALELO usando ThreadPoolExecutor (4 workers)
- Fallback a detección por puerto si no hay .lock
- Limpieza del .lock al terminar
- Orphan killer concurrente

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
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, cast

# Define SIGKILL for Windows compatibility
SIGKILL = getattr(signal, "SIGKILL", signal.SIGTERM)

# --- Configuración ---
MAX_WORKERS = 4  # Threads concurrentes para operaciones de kill
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

    try:
        files: list[Path] = []
        for pat in patterns:
            files.extend(LOG_DIR.glob(pat))

        # Agrupar archivos por su prefijo (ej: "backend.", "frontend.")
        groups: dict[str, list[Path]] = {}
        for f in files:
            parts = f.name.split(".")
            prefix = parts[0]
            if prefix not in groups:
                groups[prefix] = []
            groups[prefix].append(f)

        for _, file_list in groups.items():
            file_list.sort(key=lambda x: x.stat().st_mtime)
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

    def is_locked(self) -> bool:
        """Verifica si el archivo está bloqueado por otro proceso (Windows 11)."""
        if not self.path.exists():
            return False
        try:
            with open(self.path, "a") as f:
                if is_windows():
                    import msvcrt

                    try:
                        msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
                        msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
                        return False
                    except OSError:
                        return True
                else:
                    import importlib

                    fcntl = importlib.import_module("fcntl")
                    try:
                        fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
                        fcntl.flock(f, fcntl.LOCK_UN)
                        return False
                    except OSError:
                        return True
        except (OSError, PermissionError):
            return True

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


def kill_lock_owner() -> bool:
    """
    Intenta matar el proceso que tiene el lock file bloqueado (Windows 11).
    Usa PowerShell para buscar procesos python con start.local en su línea de comandos.
    """
    if not is_windows():
        return False

    try:
        result = subprocess.run(
            [
                "powershell",
                "-Command",
                "Get-CimInstance Win32_Process | Where-Object { "
                "$_.Name -eq 'python.exe' -and $_.CommandLine -match 'start\\.local' } | "
                "Select-Object ProcessId | ConvertTo-Json",
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )

        if result.returncode != 0 or not result.stdout.strip():
            return False

        import json as json_mod

        processes = json_mod.loads(result.stdout)

        if isinstance(processes, dict):
            processes = [processes]

        # Matar masters en paralelo
        killed = False

        def _kill_master(pid: int) -> bool:
            logger.info(f"🔐 Matando proceso master (start.local.py): PID {pid}")
            subprocess.run(["taskkill", "/F", "/PID", str(pid), "/T"], capture_output=True, timeout=10)
            return True

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = []
            for proc in processes:
                pid = proc.get("ProcessId")
                if pid:
                    futures.append(executor.submit(_kill_master, pid))

            for future in as_completed(futures):
                try:
                    if future.result():
                        killed = True
                except Exception:
                    pass

        if killed:
            time.sleep(1)  # Esperar a que SO libere recursos

        return killed

    except Exception as e:
        logger.debug(f"Error en kill_lock_owner: {e}")
        return False


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
                if key:
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
        return True

    try:
        if is_windows():
            cmd = ["taskkill"]
            if force:
                cmd.append("/F")
            cmd.extend(["/PID", str(pid), "/T"])

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            return result.returncode == 0 or "not found" in result.stderr.lower()
        else:
            if force:
                os.kill(pid, SIGKILL)
            else:
                os.kill(pid, signal.SIGTERM)

            for _ in range(10):
                if not is_process_running(pid):
                    return True
                time.sleep(0.5)

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
        result = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, timeout=10)

        for line in result.stdout.split("\n"):
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


def _kill_single_process(proc_info: dict[str, Any], force: bool) -> tuple[str, bool]:
    """Worker: mata un proceso individual. Retorna (tipo, éxito)."""
    proc_type = proc_info.get("type", "unknown")
    pid = proc_info.get("pid")
    port = proc_info.get("port")

    if not pid:
        return (proc_type, False)

    logger.info(f"🛑 Deteniendo {proc_type} (PID: {pid}, Puerto: {port})")

    if kill_process(pid, force):
        logger.info(f"   ✓ {proc_type} detenido")
        return (proc_type, True)

    logger.warning("   ⚠️ No se pudo detener por PID, intentando por puerto...")

    if port and is_port_in_use(port):
        kill_func = kill_by_port_windows if is_windows() else kill_by_port_unix
        if kill_func(port):
            logger.info(f"   ✓ {proc_type} detenido (vía puerto)")
            return (proc_type, True)

    return (proc_type, False)


def stop_from_lock(lock_data: dict[str, Any], stop_backend: bool, stop_frontend: bool, force: bool) -> int:
    """Detiene procesos usando información del .lock, en PARALELO."""
    killed = 0
    processes = lock_data.get("processes", [])
    pid_master = lock_data.get("pid_master")

    # 1. Filtrar procesos a detener
    to_kill = []
    for proc_info in processes:
        proc_type = proc_info.get("type", "unknown")
        if proc_type == "backend" and not stop_backend:
            continue
        if proc_type == "frontend" and not stop_frontend:
            continue
        to_kill.append(proc_info)

    # 2. Matar todos los hijos en PARALELO
    if to_kill:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {
                executor.submit(_kill_single_process, proc, force): proc for proc in to_kill
            }
            for future in as_completed(futures):
                try:
                    _, success = future.result()
                    if success:
                        killed += 1
                except Exception as e:
                    logger.debug(f"Error en worker de kill: {e}")

    # 3. Detener Master (start.local.py) si estamos deteniendo todo
    if stop_backend and stop_frontend and pid_master:
        logger.info(f"🛑 Deteniendo proceso maestro (PID: {pid_master})")
        if kill_process(pid_master, force):
            logger.info("   ✓ Maestro detenido")
            time.sleep(1)
        else:
            logger.warning("   ⚠️ No se pudo detener el maestro (¿ya cerrado?)")

    return killed


def stop_by_ports(backend_port: int, frontend_port: int, stop_backend: bool, stop_frontend: bool) -> int:
    """Fallback: detiene procesos por puerto, en PARALELO."""
    kill_func = kill_by_port_windows if is_windows() else kill_by_port_unix
    killed = 0

    def _kill_port(port: int, label: str) -> tuple[str, bool]:
        if is_port_in_use(port):
            logger.info(f"🛑 Deteniendo proceso en puerto {port} ({label})")
            if kill_func(port):
                logger.info(f"   ✓ {label} detenido")
                return (label, True)
        return (label, False)

    tasks = []
    if stop_backend:
        tasks.append((backend_port, "backend"))
    if stop_frontend:
        tasks.append((frontend_port, "frontend"))

    if tasks:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(_kill_port, port, label): label for port, label in tasks}
            for future in as_completed(futures):
                try:
                    _, success = future.result()
                    if success:
                        killed += 1
                except Exception:
                    pass

    return killed


def kill_orphan_processes() -> int:
    """
    Limpieza agresiva de procesos huérfanos de python/node del proyecto.
    Usa ThreadPoolExecutor para matar múltiples orphans en paralelo.
    """
    killed = 0
    project_path = str(PROJECT_ROOT).lower()

    if is_windows():
        try:
            result = subprocess.run(
                [
                    "powershell",
                    "-Command",
                    "Get-CimInstance Win32_Process | Where-Object { "
                    "$_.Name -match 'python|node' } | "
                    "Select-Object ProcessId, Name, CommandLine | "
                    "ConvertTo-Json",
                ],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode != 0 or not result.stdout.strip():
                return 0

            import json as json_mod

            processes = json_mod.loads(result.stdout)

            if isinstance(processes, dict):
                processes = [processes]

            # Filtrar procesos del proyecto (excluyendo stop.local.py actual)
            orphans: list[tuple[int, str]] = []
            for proc in processes:
                cmd_line = (proc.get("CommandLine") or "").lower()
                pid = proc.get("ProcessId")
                name = proc.get("Name", "")

                if not pid or not cmd_line:
                    continue

                if project_path in cmd_line:
                    if str(os.getpid()) == str(pid):
                        continue
                    orphans.append((pid, name))

            # Matar orphans en paralelo
            if orphans:

                def _kill_orphan(pid: int, name: str) -> bool:
                    logger.info(f"🧹 Matando proceso huérfano: {name} (PID: {pid})")
                    try:
                        subprocess.run(
                            ["taskkill", "/F", "/PID", str(pid), "/T"],
                            capture_output=True,
                            timeout=10,
                        )
                        return True
                    except Exception as e:
                        logger.debug(f"   Error matando {pid}: {e}")
                        return False

                with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                    futures = [executor.submit(_kill_orphan, pid, name) for pid, name in orphans]
                    for future in as_completed(futures):
                        try:
                            if future.result():
                                killed += 1
                        except Exception:
                            pass

        except Exception as e:
            logger.debug(f"Error en kill_orphan_processes: {e}")

    else:
        # Unix/Linux: usar ps + grep
        try:
            result = subprocess.run(["ps", "aux"], capture_output=True, text=True, timeout=10)

            orphans_unix: list[int] = []
            for line in result.stdout.split("\n"):
                line_lower = line.lower()

                if ("python" in line_lower or "node" in line_lower) and project_path in line_lower:
                    parts = line.split()
                    if len(parts) >= 2:
                        try:
                            pid = int(parts[1])
                            if pid != os.getpid():
                                orphans_unix.append(pid)
                        except ValueError:
                            continue

            for pid in orphans_unix:
                try:
                    logger.info(f"🧹 Matando proceso huérfano: PID {pid}")
                    os.kill(pid, SIGKILL)
                    killed += 1
                except ProcessLookupError:
                    continue

        except Exception as e:
            logger.debug(f"Error en kill_orphan_processes: {e}")

    if killed > 0:
        logger.info(f"✓ Se eliminaron {killed} procesos huérfanos")

    return killed


def verify_stopped(backend_port: int, frontend_port: int, stop_backend: bool, stop_frontend: bool) -> bool:
    """Verifica que los puertos estén libres (verificación paralela)."""
    time.sleep(2)

    issues = []

    def _check_port(port: int, label: str) -> str | None:
        if is_port_in_use(port):
            return f"Puerto {port} ({label}) aún en uso"
        return None

    checks = []
    if stop_backend:
        checks.append((backend_port, "backend"))
    if stop_frontend:
        checks.append((frontend_port, "frontend"))

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(_check_port, port, label): label for port, label in checks}
        for future in as_completed(futures):
            result = future.result()
            if result:
                issues.append(result)

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

    print("\n>>> Deteniendo ecommerce-playground <<<\n")

    # Limpieza de logs n-1
    cleanup_logs(keep_count=3)

    # Cargar configuración
    load_env()

    backend_port = int(os.getenv("BACKEND_PORT", "8042"))
    frontend_port = int(os.getenv("FRONTEND_PORT", "5173"))

    stop_backend = not args.frontend_only
    stop_frontend = not args.backend_only

    # Leer .lock
    lock = LockFile(LOCK_FILE)
    lock_data = lock.read()

    # Verificar si hay algo que detener (en paralelo)
    with ThreadPoolExecutor(max_workers=2) as executor:
        f_backend = executor.submit(is_port_in_use, backend_port)
        f_frontend = executor.submit(is_port_in_use, frontend_port)
        backend_running = f_backend.result()
        frontend_running = f_frontend.result()

    # PASO 1: Siempre intentar matar el proceso master primero
    master_killed = kill_lock_owner()
    if master_killed:
        time.sleep(2)
        lock_data = lock.read()

    if not backend_running and not frontend_running and not lock_data and not master_killed:
        logger.info("ℹ️ El sistema no parece estar corriendo")
        kill_orphan_processes()
        lock.delete()
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
    if master_killed:
        logger.info("   - Proceso master detenido")
    logger.info("")

    killed = 0

    # PASO 2: Usar información del .lock para matar procesos (PARALELO)
    if lock_data:
        logger.info("Usando información del lock file...")
        killed = stop_from_lock(lock_data, stop_backend, stop_frontend, args.force)

    # PASO 3: Fallback por puerto (PARALELO)
    if not verify_stopped(backend_port, frontend_port, stop_backend, stop_frontend):
        logger.info("Usando detección por puerto...")
        killed += stop_by_ports(backend_port, frontend_port, stop_backend, stop_frontend)

    # Limpiar .lock
    lock.delete()

    # PASO 4: Limpieza final de huérfanos (PARALELO internamente)
    orphan_killed = kill_orphan_processes()
    killed += orphan_killed

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
