from logging.handlers import RotatingFileHandler
import os
from pathlib import Path

def setup_logs():
    """Configura logging granular por módulo en data/logs/"""
    log_dir = Path("data/logs")
    log_dir.mkdir(parents=True, exist_ok=True)

    # Mapeo de nombre de archivo (sin .log) -> lista de loggers python
    mappings = {
        "auth": ["backend.api.auth", "backend.utils.auth"],
        "products": ["backend.api.products", "backend.services.product_service"],
        "finance": ["backend.api.finance", "backend.services.finance_service"],
        "sales": ["backend.api.sales", "backend.services.sales_service"],
        "cart": ["backend.api.cart", "backend.services.cart_service"],
        "tax": ["backend.api.tax_admin", "backend.services.tax_service"],
        "user": ["backend.api.user_admin", "backend.services.user_service"],
        "customization": ["backend.api.customization", "backend.services.customization_service"],
        "business": ["backend.api.business", "backend.services.business_service"],
        "client": ["backend.api.client_logs"],
        "images": ["backend.services.image_service", "backend.api.images"],
        "database": ["backend.database.manager"]
    }

    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    for log_name, loggers in mappings.items():
        try:
            file_path = log_dir / f"{log_name}.log"
            # Rotación: Máx 5MB, mantener 3 backups
            file_handler = RotatingFileHandler(
                file_path, 
                maxBytes=5*1024*1024, 
                backupCount=3, 
                encoding='utf-8'
            )
            file_handler.setFormatter(formatter)
            file_handler.setLevel(logging.INFO)
            
            for logger_name in loggers:
                l = logging.getLogger(logger_name)
                l.addHandler(file_handler)
                l.propagate = True # Seguir enviando al root logger (backend.log console)
        except Exception as e:
            print(f"Error configurando log {log_name}: {e}")
