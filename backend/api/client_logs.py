import logging

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)  # Mapeado a 'client.log' en utils/logging.py


class LogEntry(BaseModel):
    level: str
    message: str
    timestamp: str | None = None
    stack: str | None = None
    url: str | None = None


@router.post("/", status_code=202)
async def log_client_event(entry: LogEntry):
    """
    Recibe logs del frontend para centralizar observabilidad.
    """
    # Formatear mensaje estilo [CLIENT] <URL> | <MENSAJE>
    log_msg = f"[CLIENT] {entry.url or 'unknown'} | {entry.message}"

    # Añadir stack trace si es error
    if entry.stack:
        log_msg += f"\nStack: {entry.stack}"

    # Mapear niveles JS a Python Logging
    lvl = entry.level.lower()
    if lvl == "error":
        logger.error(log_msg)
    elif lvl == "warn" or lvl == "warning":
        logger.warning(log_msg)
    elif lvl == "debug":
        logger.debug(log_msg)
    else:
        logger.info(log_msg)

    return {"status": "received"}
