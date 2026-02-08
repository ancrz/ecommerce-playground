import asyncio
import logging
import smtplib
from concurrent.futures import ThreadPoolExecutor
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ..core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Servicio de Envío de Correos (SMTP) con Circuit Breaker y Reintentos.
    Implementación asíncrona usando ThreadPoolExecutor para no bloquear el loop.
    """

    def __init__(self):
        self.enabled = settings.ENABLE_EMAIL
        self.executor = ThreadPoolExecutor(max_workers=3)  # Worker pool para envíos

    async def verify_connection(self) -> bool:
        """
        Circuit Breaker: Verifica si el servidor SMTP responde.
        Retorna True si la conexión es exitosa, False si falla.
        """
        if not self.enabled:
            return False

        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(self.executor, self._sync_verify)
            return True
        except Exception as e:
            logger.error(f"Fallo verificación SMTP: {e}")
            return False

    def _sync_verify(self):
        """Versión sincrónica de la verificación (para el executor)."""
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5)
        server.starttls()
        # Si hay usuario/pass, intentamos login. Si no, solo conexión.
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.quit()

    async def send_email(
        self,
        to: str,
        subject: str,
        body: str = "",
        html: str | None = None,
        attachments: list | None = None,
        retries: int = 3,
    ):
        """
        Envía un correo electrónico con lógica de reintentos (Fail-safe).
        """
        if not self.enabled:
            logger.warning(f"Email desactivado. Se omitió envío a {to}: {subject}")
            return False

        loop = asyncio.get_running_loop()

        for attempt in range(1, retries + 1):
            try:
                await loop.run_in_executor(self.executor, self._sync_send_email, to, subject, body, html, attachments)
                logger.info(f"Correo enviado exitosamente a {to}")
                return True
            except Exception as e:
                logger.error(f"Error enviando correo a {to} (Intento {attempt}/{retries}): {e}")
                if attempt < retries:
                    await asyncio.sleep(2 * attempt)  # Backoff simple: 2s, 4s, 6s
                else:
                    logger.error(f"Fallo definitivo enviando correo a {to} después de {retries} intentos.")
                    return False

    def _sync_send_email(self, to: str, subject: str, body: str, html: str, attachments: list):
        """Versión sincrónica del envío."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        msg["To"] = to

        # Cuerpo del mensaje (Texto plano y HTML)
        msg.attach(MIMEText(body, "plain"))
        if html:
            msg.attach(MIMEText(html, "html"))

        # Adjuntos (e.g., Facturas PDF)
        if attachments:
            for file_name, file_content in attachments:
                part = MIMEApplication(file_content, Name=file_name)
                part["Content-Disposition"] = f'attachment; filename="{file_name}"'
                msg.attach(part)

        # Conexión y Envío
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.sendmail(msg["From"], [to], msg.as_string())
        server.quit()
