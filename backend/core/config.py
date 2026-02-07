from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App Config
    APP_NAME: str = "Ecommerce Playground API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    PORT: int = Field(8042, validation_alias="BACKEND_PORT")
    API_DOMAIN: str = Field("localhost:8042", validation_alias="API_DOMAIN")
    SUPPORT_EMAIL: str = Field("no-reply@ecommerce-playground.local", validation_alias="SUPPORT_EMAIL")

    # Paths
    UPLOAD_PATH: str = "./data/uploads"
    LOGS_PATH: str = "./data/logs"
    DATABASE_URL: str = "sqlite:///./data/ecommerce.db"

    # Security (Defaults for dev, override in prod)
    # Security (Defaults for dev, override in prod)
    SECRET_KEY: str = Field("supersecretkey", validation_alias="JWT_SECRET_KEY")
    ALGORITHM: str = Field("HS256", validation_alias="JWT_ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Session Management
    SESSION_EXPIRE_MINUTES: int = 60
    GUEST_SESSION_EXPIRE_MINUTES: int = 43200  # 30 days

    # SMTP Configuration
    ENABLE_EMAIL: bool = False
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str | None = None

    # Permission Constants (Unix-style)
    # READ = 4, WRITE = 2, EXECUTE = 1
    PERM_READ: int = 4
    PERM_WRITE: int = 2
    PERM_EXECUTE: int = 1

    # CORS
    FRONTEND_PORT: int = Field(5173, validation_alias="FRONTEND_PORT")
    BACKEND_URL: str = Field("http://localhost:8042", validation_alias="BACKEND_URL")
    CORS_ORIGINS: list[str] = []

    def model_post_init(self, __context):
        # Asegurar que CORS_ORIGINS use el puerto correcto cargado de env
        if not self.CORS_ORIGINS:
            self.CORS_ORIGINS = [
                f"http://localhost:{self.FRONTEND_PORT}",
                f"http://127.0.0.1:{self.FRONTEND_PORT}",
                "http://localhost:5173", # Fallback común
            ]
        # Sincronizar BACKEND_URL si el puerto cambió pero la URL no
        if f":{self.PORT}" not in self.BACKEND_URL and "localhost" in self.BACKEND_URL:
             self.BACKEND_URL = f"http://localhost:{self.PORT}"
        
        # Sincronizar API_DOMAIN
        if "localhost" in self.API_DOMAIN and f":{self.PORT}" not in self.API_DOMAIN:
            self.API_DOMAIN = f"localhost:{self.PORT}"

    model_config = {
        "env_file": ".env",
        "extra": "ignore",  # Ignorar campos en .env que no estén definidos aquí
    }


@lru_cache
def get_settings():
    return Settings()


settings = get_settings()
