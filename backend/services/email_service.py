import logging

from ..core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Servicio de Envío de Correos (SMTP).
    """

    def __init__(self):
        self.enabled = settings.ENABLE_EMAIL
        logger.info(f"EmailService inicializado. Habilitado: {self.enabled}")

    async def send_email(self, to: str, subject: str, body: str = "", attachments: list = None):
        """
        Envía un correo electrónico.
        Si ENABLE_EMAIL es False, solo loguea.
        """
        if not self.enabled:
            logger.warning(f"Email desactivado. Se omitió envío a {to}: {subject}")
            return

        logger.info(f"Enviando correo a {to} | Asunto: {subject} | Adjuntos: {len(attachments or [])}")
        # Aquí iría la implementación real con aiosmtplib o similar
