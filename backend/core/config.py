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
