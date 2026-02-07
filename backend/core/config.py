from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App Config
    APP_NAME: str = "Ecommerce Playground API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    PORT: int = 8042

    # Paths
    UPLOAD_PATH: str = "./data/uploads"
    LOGS_PATH: str = "./data/logs"
    DATABASE_URL: str = "sqlite:///./data/ecommerce.db"

    # Security (Defaults for dev, override in prod)
    SECRET_KEY: str = "supersecretkey"
    ALGORITHM: str = "HS256"
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
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    model_config = {
        "env_file": ".env",
        "extra": "ignore",  # Ignorar campos en .env que no estén definidos aquí
    }


@lru_cache
def get_settings():
    return Settings()


settings = get_settings()
