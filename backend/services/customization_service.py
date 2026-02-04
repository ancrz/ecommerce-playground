import logging
from datetime import datetime

from pydantic import BaseModel

from ..database.manager import DatabaseManager
from ..models.config import Customization
from .image_service import ImageService

logger = logging.getLogger(__name__)


class CustomizationUpdate(BaseModel):
    """DTO para actualizar la información de personalización"""

    primary_color: str | None = None
    secondary_color: str | None = None
    accent_color: str | None = None
    font_family: str | None = None
    custom_css: str | None = None
    icon_products_url: str | None = None
    icon_business_url: str | None = None
    icon_customization_url: str | None = None
    icon_finance_url: str | None = None
    icon_sales_url: str | None = None
    icon_users_url: str | None = None
    icon_tax_url: str | None = None


class CustomizationService:
    """
    Servicio para la lógica de negocio de la Personalización.
    """

    def __init__(self, db_manager: DatabaseManager, image_service: ImageService):
        self.db_manager = db_manager
        self.image_service = image_service
        logger.info("CustomizationService inicializado.")

    async def get_customization(self) -> Customization:
        """
        Obtiene la configuración de personalización (fila única, id=1).
        """
        row = await self.db_manager.fetchone("customization", "SELECT * FROM customization WHERE id = 1")
        if not row:
            logger.warning("¡Fila de customization (id=1) no encontrada! Devolviendo valores por defecto.")
            return Customization()  # Devuelve valores por defecto si no hay nada en BD

        return Customization.model_validate(row)

    async def update_customization(self, updates: CustomizationUpdate) -> Customization:
        """
        Actualiza parcial o totalmente la información de personalización.
        """
        updates_dict = updates.model_dump(exclude_unset=True)

        if not updates_dict:
            logger.warning("Actualización de Customization llamada sin datos.")
            return await self.get_customization()

        updates_dict["updated_at"] = datetime.now().isoformat()

        # Obtenemos los campos del modelo que SÍ están en la base de datos
        db_columns = [
            "primary_color",
            "secondary_color",
            "accent_color",
            "font_family",
            "custom_css",
            "icon_products_url",
            "icon_business_url",
            "icon_customization_url",
            "icon_finance_url",
            "icon_sales_url",
            "icon_users_url",
            "icon_tax_url",
            "updated_at",
        ]

        # Filtramos los datos que vamos a actualizar para evitar errores de columnas inexistentes
        filtered_updates = {k: v for k, v in updates_dict.items() if k in db_columns}

        set_clause_parts = [f"{key} = ?" for key in filtered_updates.keys()]
        params = list(filtered_updates.values())
        params.append(1)  # para WHERE id = 1

        query = f"UPDATE customization SET {', '.join(set_clause_parts)} WHERE id = ?"

        try:
            await self.db_manager.execute("customization", query, tuple(params))
            logger.info(f"Información de personalización actualizada con {len(filtered_updates)} campos.")
            return await self.get_customization()
        except Exception as e:
            logger.error(f"Error al actualizar customization: {e}", exc_info=True)
            raise ValueError(f"Error al actualizar la base de datos: {e}")

    async def upload_module_icon(self, module_name: str, file_data: bytes, original_filename: str) -> Customization:
        """
        Sube, formatea y reduce un icono para un módulo del admin.
        """
        valid_modules = ["products", "business", "customization", "finance", "sales", "users", "tax"]
        if module_name not in valid_modules:
            raise ValueError("Nombre de módulo no válido")

        image_url = self.image_service.process_and_save(
            file_data=file_data,
            original_filename=original_filename,
            save_filename=f"module_{module_name}",
            folder="icons",
            max_size=(64, 64),
        )

        db_field_name = f"icon_{module_name}_url"

        updates = CustomizationUpdate()
        setattr(updates, db_field_name, image_url)

        return await self.update_customization(updates)
