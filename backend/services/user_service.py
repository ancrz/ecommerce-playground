"""
Servicio de Usuario (UserService)
REFACTORIZADO: (RBAC + Autogestión)
Añadida la función 'get_all_users' para el módulo de admin.
"""

import hashlib
import json
import logging
import os
import random
import secrets
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage
from typing import Any

# --- Dependencias para Autogestión ---
import aiosmtplib  # Para envío de correo asíncrono

# --- Dependencias para JWT ---
import jwt
import requests  # type: ignore  # Para validar Captcha
from jwt import PyJWTError

from ..core.config import settings
from ..database.manager import DatabaseManager

# --- Importaciones Internas ---
from ..models import PasswordResetToken, User, UserCreateRequest, UserUpdateRequest

logger = logging.getLogger(__name__)

# --- Configuración JWT ---
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
# ACCESS_TOKEN_EXPIRE_MINUTES removed, using settings directly


class UserService:
    """
    Servicio para la lógica de negocio de Usuarios y Autenticación.
    """

    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        logger.info("UserService inicializado")

    # --- Métodos de Criptografía Segura (con Salt) ---

    def _hash_password(self, password: str, salt: bytes | None = None) -> str:
        """
        Genera un hash PBKDF2-SHA256 de la contraseña con un salt.
        """
        if salt is None:
            salt = secrets.token_bytes(16)  # Generar nuevo salt

        hashed_bytes = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            100000,  # Iteraciones
        )
        return f"{salt.hex()}${hashed_bytes.hex()}"

    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verifica una contraseña contra un hash (salt + hash)."""
        try:
            salt_hex, hash_hex = hashed_password.split("$")
            salt = bytes.fromhex(salt_hex)
        except ValueError:
            return False

        rehashed_password = self._hash_password(plain_password, salt)
        return secrets.compare_digest(rehashed_password, hashed_password)

    # --- Métodos de Serialización de Roles (RBAC) ---

    def _serialize_roles(self, roles: list[str]) -> str:
        """Convierte la lista de roles (Python) a un string JSON (DB)"""
        return json.dumps(sorted(set(roles)))

    def _deserialize_roles(self, roles_json: str) -> list[str]:
        """Convierte el string JSON (DB) a una lista de roles (Python)"""
        try:
            val = json.loads(roles_json or "[]")
            if isinstance(val, list):
                return [str(v) for v in val]
            return []
        except json.JSONDecodeError:
            return []

    # --- Métodos de Gestión de Usuarios (CRUD) ---

    async def _row_to_user(self, row: dict[str, Any] | None) -> User | None:
        """Convierte una fila de DB (dict) al modelo DTO 'User'."""
        if not row:
            return None
        try:
            row_dict = dict(row)
            row_dict["roles"] = self._deserialize_roles(row_dict.get("roles", "[]"))
            # REFACTOR: Asegurar que is_active sea booleano (DB guarda 0/1)
            row_dict["is_active"] = bool(row_dict.get("is_active", False))
            return User.model_validate(row_dict)
        except Exception as e:
            logger.error(f"Error al validar fila de usuario: {e}. Fila: {row}", exc_info=True)
            return None

    # --- INICIO DE LA MEJORA (RBAC) ---
    async def get_all_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        """
        Obtiene una lista de usuarios (para el Admin Panel) con paginación.
        """
        # Usamos parameter binding para limit y offset por seguridad
        rows = await self.db_manager.fetchall(
            "users", "SELECT * FROM users ORDER BY username LIMIT ? OFFSET ?", (limit, skip)
        )
        users = []
        for row in rows:
            user = await self._row_to_user(row)
            if user:
                users.append(user)
        return users

    # --- FIN DE LA MEJORA ---

    async def get_user_by_username(self, username: str) -> User | None:
        """Busca un usuario por su nombre de usuario."""
        row = await self.db_manager.fetchone("users", "SELECT * FROM users WHERE username = ?", (username,))
        return await self._row_to_user(row)

    async def get_user_by_email(self, email: str) -> User | None:
        """Busca un usuario por su email."""
        row = await self.db_manager.fetchone(
            "users", "SELECT * FROM users WHERE email = ? AND is_active = 1", (email.lower(),)
        )
        return await self._row_to_user(row)

    async def get_user_by_id(self, user_id: str) -> User | None:
        """Busca un usuario por su ID."""
        row = await self.db_manager.fetchone("users", "SELECT * FROM users WHERE id = ?", (user_id,))
        return await self._row_to_user(row)

    async def create_user(self, user_data: UserCreateRequest) -> User:
        """
        Crea un nuevo usuario en la base de datos (Admin).
        Usado por 'create_dummy_data.py' o el 'Módulo de Gestión de Usuarios'.
        """
        if await self.get_user_by_username(user_data.username):
            raise ValueError(f"El nombre de usuario '{user_data.username}' ya existe.")

        if user_data.email and await self.get_user_by_email(user_data.email):
            raise ValueError(f"El email '{user_data.email}' ya está en uso.")

        hashed_password = self._hash_password(user_data.plain_password)

        user = User(
            username=user_data.username,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            email=user_data.email.lower() if user_data.email else None,
            roles=user_data.roles,
            is_active=user_data.is_active,
        )

        await self.db_manager.execute(
            "users",
            """
            INSERT INTO users (id, username, password_hash, full_name, email, roles, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user.id,
                user.username,
                user.password_hash,
                user.full_name,
                user.email,
                self._serialize_roles(user.roles),  # Guardar como JSON
                user.is_active,
                user.created_at.isoformat(),
                user.updated_at.isoformat(),
            ),
        )
        logger.info(f"Usuario '{user.username}' (Roles: {user.roles}) creado exitosamente.")
        return user

    # --- Métodos de Autenticación (Lógica) ---

    async def authenticate_user(self, username: str, plain_password: str) -> User | None:
        """
        Valida las credenciales del usuario (Username + Password) contra la DB.
        """
        row = await self.db_manager.fetchone("users", "SELECT * FROM users WHERE username = ?", (username,))
        user = await self._row_to_user(row)

        if not user:
            logger.warning(f"Intento de login fallido: Usuario '{username}' no encontrado.")
            return None

        if not user.is_active:
            logger.warning(f"Intento de login fallido: Usuario '{username}' está inactivo.")
            return None

        if not self._verify_password(plain_password, user.password_hash):
            logger.warning(f"Intento de login fallido: Contraseña incorrecta para '{username}'.")
            return None

        logger.info(f"Usuario '{username}' autenticado exitosamente.")
        return user

    # --- Métodos de Sesión (Token en Memoria) ---

    def create_token(self, user: User) -> str:
        """
        Crea un JWT para un usuario validado.
        """
        to_encode = {
            "sub": user.id,
            "username": user.username,
            "roles": user.roles,
            "exp": datetime.now(UTC) + timedelta(minutes=settings.SESSION_EXPIRE_MINUTES),
        }
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        logger.info(f"JWT creado para usuario: {user.username}")
        return encoded_jwt

    def verify_token(self, token: str) -> dict[str, Any] | None:
        """
        Verifica un JWT y devuelve los datos del usuario si es válido.
        """
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except PyJWTError as e:
            logger.warning(f"Error al verificar JWT: {e}")
            return None

    def revoke_token(self, token: str) -> bool:
        """
        Para JWTs, la revocación no es estrictamente necesaria si son de corta duración.
        Si se requiere, se implementaría una lista negra de tokens.
        Por ahora, es un no-op.
        """
        logger.info("Revocación de token llamada para JWT (no-op en implementación actual).")
        return True

    # --- Métodos de Autogestión (Panel de Usuario) ---

    async def update_user_profile(self, user_id: str, updates: UserUpdateRequest) -> User:
        """
        Permite a un usuario (o admin) actualizar datos básicos (nombre, email).
        """
        safe_updates = {"full_name": updates.full_name, "email": updates.email.lower() if updates.email else None}
        update_dict = {k: v for k, v in safe_updates.items() if v is not None}

        if not update_dict:
            raise ValueError("No se proporcionaron datos para actualizar.")

        # (Lógica futura: enviar código de 6 dígitos si el 'email' cambió)

        update_dict["updated_at"] = datetime.now().isoformat()
        set_clause = ", ".join([f"{key} = ?" for key in update_dict.keys()])
        params = list(update_dict.values())
        await self.db_manager.execute("users", f"UPDATE users SET {set_clause} WHERE id = ?", tuple(params))

        updated_user = await self.get_user_by_id(user_id)
        if not updated_user:
            raise ValueError("Usuario no encontrado después de actualizar.")
        return updated_user

    async def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """
        Permite a un usuario logueado cambiar su propia contraseña.
        """
        user = await self.get_user_by_id(user_id)
        if not user:
            raise ValueError("Usuario no encontrado.")

        if not self._verify_password(old_password, user.password_hash):
            raise ValueError("La contraseña antigua es incorrecta.")

        new_hashed_password = self._hash_password(new_password)
        await self.db_manager.execute(
            "users",
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (new_hashed_password, datetime.now().isoformat(), user_id),
        )
        logger.info(f"Contraseña cambiada exitosamente por el usuario: {user.username}")
        return True

    # --- Métodos de Administración (RBAC) ---

    async def admin_update_user(self, user_id_to_update: str, updates: UserUpdateRequest) -> User:
        """
        Permite a un Admin actualizar roles, estado, y datos de otro usuario.
        """
        update_dict = updates.model_dump(exclude_unset=True)

        if "roles" in update_dict:
            update_dict["roles"] = self._serialize_roles(update_dict["roles"])

        if not update_dict:
            raise ValueError("No se proporcionaron datos para actualizar.")

        update_dict["updated_at"] = datetime.now().isoformat()
        set_clause = ", ".join([f"{key} = ?" for key in update_dict.keys()])
        params = list(update_dict.values())
        params.append(user_id_to_update)

        await self.db_manager.execute("users", f"UPDATE users SET {set_clause} WHERE id = ?", tuple(params))

        updated_user = await self.get_user_by_id(user_id_to_update)
        if not updated_user:
            raise ValueError("Usuario no encontrado después de actualizar.")
        logger.info(f"Admin actualizó el perfil de: {updated_user.username}")
        return updated_user

    async def admin_reset_password(self, user_id: str, new_password: str) -> bool:
        """Permite a un Admin forzar una nueva contraseña para un usuario."""
        new_hashed_password = self._hash_password(new_password)
        await self.db_manager.execute(
            "users",
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (new_hashed_password, datetime.now().isoformat(), user_id),
        )
        logger.info(f"Admin forzó reseteo de contraseña para usuario ID: {user_id}")
        return True

    # --- Métodos de Autogestión (Recuperación de Clave) ---

    def _validate_captcha(self, captcha_token: str) -> bool:
        """
        Valida un token de hCaptcha/reCAPTCHA (MVP).
        """
        CAPTCHA_SECRET_KEY = os.getenv("HCAPTCHA_SECRET_KEY", "0x0000000000000000000000000000000000000000")

        if not CAPTCHA_SECRET_KEY or CAPTCHA_SECRET_KEY == "0x0000000000000000000000000000000000000000":
            logger.warning("Omisión de validación de Captcha: HCAPTCHA_SECRET_KEY no está configurada.")
            return True  # Omitir si no está configurado (solo para demo)

        try:
            response = requests.post(
                "https://hcaptcha.com/siteverify", data={"secret": CAPTCHA_SECRET_KEY, "response": captcha_token}
            )
            response.raise_for_status()
            return bool(response.json().get("success", False))
        except Exception as e:
            logger.error(f"Error al validar Captcha: {e}")
            return False

    async def _send_email(self, to_email: str, subject: str, html_content: str):
        """
        Envía un correo usando un Relay SMTP (aiosmtplib).
        (Cumple con la premisa de 'tecnologías simples')
        """
        SMTP_HOST = settings.SMTP_HOST
        SMTP_PORT = settings.SMTP_PORT
        SMTP_USER = settings.SMTP_USER
        SMTP_PASSWORD = settings.SMTP_PASSWORD
        SMTP_FROM_EMAIL = settings.SMTP_FROM_EMAIL or settings.SUPPORT_EMAIL

        if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD]):
            logger.error("Error de configuración de Correo: Variables SMTP no definidas.")
            raise ValueError("El servicio de envío de correo no está configurado.")

        message = EmailMessage()
        message["From"] = SMTP_FROM_EMAIL
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(f"Tu código de un solo uso es: {html_content}")  # Fallback de texto plano
        message.add_alternative(
            f"""
            <html>
            <head>
                <style>
                    body {{ font-family: 'Poppins', sans-serif; }}
                    .container {{ padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 400px; margin: auto; }}
                    .code {{ font-size: 32px; font-weight: bold; color: #264192; letter-spacing: 4px; margin: 20px 0; }}
                    .footer {{ font-size: 12px; color: #888; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Tu código de recuperación</h2>
                    <p>Usa el siguiente código para resetear tu contraseña. El código es válido por 15 minutos.</p>
                    <div class="code">{html_content}</div>
                    <p class="footer">Si no solicitaste esto, puedes ignorar este correo.</p>
                </div>
            </body>
            </html>
            """,
            subtype="html",
        )

        try:
            await aiosmtplib.send(
                message, hostname=SMTP_HOST, port=SMTP_PORT, username=SMTP_USER, password=SMTP_PASSWORD, start_tls=True
            )
            logger.info(f"Correo de recuperación enviado exitosamente a: {to_email}")
        except Exception as e:
            logger.error(f"Error al enviar correo: {e}", exc_info=True)
            raise ValueError("Error al enviar el correo de recuperación.") from e

    async def _create_reset_token(self, user_id: str) -> str:
        """
        Crea el código de 6 dígitos, lo hashea y lo guarda en la DB.
        """
        token = str(random.randint(100000, 999999)).zfill(6)  # Código de 6 dígitos
        token_hash = self._hash_password(token)  # Hasheado para la DB

        # Invalidar tokens viejos (para 'un unico uso')
        await self.db_manager.execute(
            "password_tokens",
            "UPDATE password_reset_tokens SET is_used = 1 WHERE user_id = ? AND is_used = 0",
            (user_id,),
        )

        token_model = PasswordResetToken(user_id=user_id, token_hash=token_hash)

        await self.db_manager.execute(
            "password_tokens",
            """
            INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, is_used, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                token_model.id,
                token_model.user_id,
                token_model.token_hash,
                token_model.expires_at.isoformat(),
                token_model.is_used,
                token_model.created_at.isoformat(),
                token_model.updated_at.isoformat(),
            ),
        )

        return token  # Devuelve el código en texto plano

    async def request_password_reset(self, email: str, captcha_token: str):
        """
        Flujo público: Valida Captcha, busca usuario y envía correo con código.
        """
        if not self._validate_captcha(captcha_token):
            raise ValueError("Verificación de Captcha fallida. Intente de nuevo.")

        user = await self.get_user_by_email(email)
        if not user:
            logger.warning(f"Solicitud de reseteo para email no existente: {email}")
            return {"message": "Si existe una cuenta con este email, se enviará un código."}

        plain_token = await self._create_reset_token(user.id)

        if not user.email:
            return {"message": "El usuario no tiene email configurado."}

        subject = f"Tu Código de Recuperación de {settings.APP_NAME}"
        await self._send_email(user.email, subject, plain_token)

        return {"message": "Si existe una cuenta con este email, se enviará un código."}

    async def _validate_reset_token(self, user_id: str, plain_token: str) -> PasswordResetToken:
        """
        Valida que el código de 6 dígitos sea correcto, no haya expirado y no haya sido usado.
        """
        rows = await self.db_manager.fetchall(
            "password_tokens", "SELECT * FROM password_reset_tokens WHERE user_id = ? AND is_used = 0", (user_id,)
        )

        if not rows:
            raise ValueError("No se encontró un código de reseteo activo. Solicite uno nuevo.")

        valid_token_model = None
        for row in rows:
            token_model = PasswordResetToken.model_validate(row)

            if datetime.now() > token_model.expires_at:
                continue  # Token expirado

            if self._verify_password(plain_token, token_model.token_hash):
                valid_token_model = token_model
                break  # Encontramos el token correcto

        if not valid_token_model:
            raise ValueError("Código inválido o expirado. Intente de nuevo.")

        return valid_token_model

    async def reset_password(self, email: str, token: str, new_password: str):
        """
        Flujo público: Valida el código y cambia la contraseña.
        """
        user = await self.get_user_by_email(email)
        if not user:
            raise ValueError("Usuario no encontrado.")

        token_model = await self._validate_reset_token(user.id, token)

        new_hashed_password = self._hash_password(new_password)
        await self.db_manager.execute(
            "users",
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (new_hashed_password, datetime.now().isoformat(), user.id),
        )

        # Marcar el token como "usado"
        await self.db_manager.execute(
            "password_tokens",
            "UPDATE password_reset_tokens SET is_used = 1, updated_at = ? WHERE id = ?",
            (datetime.now().isoformat(), token_model.id),
        )

        logger.info(f"Contraseña reseteada exitosamente (vía código) para: {user.username}")
        return {"message": "Contraseña cambiada exitosamente."}
