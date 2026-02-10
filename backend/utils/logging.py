import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logs(log_level: str = "INFO"):
    """Configura logging granular por módulo en data/logs/"""
    log_dir = Path("data/logs")
    log_dir.mkdir(parents=True, exist_ok=True)

    # Mapeo de nombre de archivo (sin .log) -> lista de loggers python
    mappings = {
        "auth": ["backend.api.auth", "backend.utils.auth", "backend.api.deps"],
        "products": ["backend.api.products", "backend.services.product_service"],
        "images": ["backend.services.image_service", "backend.api.images"],
        "cart": ["backend.api.cart", "backend.services.cart_service"],
        "sales": ["backend.api.sales", "backend.services.sales_service"],
        "finance": ["backend.api.finance", "backend.services.finance_service"],
        "billing": ["backend.api.billing", "backend.services.billing_service", "backend.services.invoice_service"],
        "tax": ["backend.api.tax_admin", "backend.services.tax_service"],
        "user": ["backend.api.user_admin", "backend.services.user_service"],
        "roles": ["backend.api.roles", "backend.services.role_service"],
        "business": ["backend.api.business", "backend.services.business_service"],
        "customization": ["backend.api.customization", "backend.services.customization_service"],
        "database": ["backend.database.manager"],
        "websocket": ["backend.api.websocket"],
        "webhook": ["backend.services.webhook_service"],
        "email": ["backend.services.email_service"],
        "client": ["backend.api.client_logs"],
        "dashboard": ["backend.api.dashboard"],
        "app": ["backend.main", "backend.core.exception_handlers"],
    }

    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    for log_name, loggers in mappings.items():
        try:
            file_path = log_dir / f"{log_name}.log"
            # Rotación: Máx 5MB, mantener 3 backups
            file_handler = RotatingFileHandler(file_path, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8")
            file_handler.setFormatter(formatter)
            file_handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))

            for logger_name in loggers:
                logger_instance = logging.getLogger(logger_name)
                logger_instance.addHandler(file_handler)
                logger_instance.propagate = True  # Seguir enviando al root logger (backend.log console)
        except Exception as e:
            logging.getLogger("backend.utils.logging").error(f"Error configurando log {log_name}: {e}")
