import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ..core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.enabled = settings.ENABLE_EMAIL
        self.server = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.sender = settings.SMTP_FROM_EMAIL

    def send_email(self, to_email: str, subject: str, body: str):
        if not self.enabled:
            logger.info(f"EMAIL DISABLED: Would have sent email to {to_email} with subject '{subject}'")
            return

        if not self.server or not self.user or not self.password:
            logger.warning("SMTP not configured properly")
            return

        try:
            msg = MIMEMultipart()
            msg["From"] = self.sender
            msg["To"] = to_email
            msg["Subject"] = subject

            msg.attach(MIMEText(body, "html"))

            # Synchronous SMTP (should be async in production usually, but sticking to stdlib for now)
            # Use SSL/TLS based on port
            server: smtplib.SMTP | smtplib.SMTP_SSL
            if self.port == 465:
                server = smtplib.SMTP_SSL(self.server, self.port)
            else:
                server = smtplib.SMTP(self.server, self.port)
                server.starttls()

            server.login(self.user, self.password)
            server.send_message(msg)
            server.quit()
            logger.info(f"Email sent to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")

    async def send_password_reset_email(self, to_email: str, token: str):
        subject = f"Restablecer Contraseña - {settings.APP_NAME}"
        # Construct link (Frontend URL should be in config, assuming localhost for now or settings.CORS_ORIGINS[0]?)
        # For now, just a token.
        reset_link = f"{settings.CORS_ORIGINS[0]}/reset-password?token={token}"

        body = f"""
        <html>
            <body>
                <h2>Restablecimiento de Contraseña</h2>
                <p>Has solicitado restablecer tu contraseña.</p>
                <p>Haz clic en el siguiente enlace para continuar:</p>
                <a href="{reset_link}">{reset_link}</a>
                <p>Si no solicitaste esto, ignora este correo.</p>
                <p>El enlace expira en {settings.SESSION_EXPIRE_MINUTES} minutos.</p>
            </body>
        </html>
        """
        # Run in executor to avoid blocking main thread
        import asyncio

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self.send_email, to_email, subject, body)
