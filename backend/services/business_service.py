"""
¡NUEVO SERVICIO!
Servicio de Negocio (Business Service)
Encapsula la lógica para gestionar la información del negocio.
"""

import json
import logging
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from ..database.manager import DatabaseManager

# Importar Modelos DTO
from ..models import BusinessInfo  # Necesitaremos ProductUpdate
from .image_service import ImageService

logger = logging.getLogger(__name__)


class BusinessInfoUpdate(BaseModel):
    """DTO para actualizar la información del negocio"""

    name: str | None = None
    rif: str | None = None
    address: str | None = None
    phone: str | None = None
    contact: str | None = None
    social_networks: list[dict[str, Any]] | None = None
    logo_url: str | None = None
    icon_url: str | None = None
    banner_url: str | None = None


class BusinessService:
    """
    Servicio para la lógica de negocio de la Información Empresarial.
    """

    def __init__(self, db_manager: DatabaseManager, image_service: ImageService):
        self.db_manager = db_manager
        self.image_service = image_service
        logger.info("BusinessService inicializado.")

    async def get_business_info(self) -> BusinessInfo:
        """
        Obtiene la información del negocio (fila única, id=1).
        """
        row = await self.db_manager.fetchone("business", "SELECT * FROM business_info WHERE id = 1")
        if not row:
            # Esto no debería pasar si manager.py se ejecutó bien
            logger.error("¡Fila de business_info (id=1) no encontrada! Re-inicializando...")
            await self._ensure_row_exists()
            row = await self.db_manager.fetchone("business", "SELECT * FROM business_info WHERE id = 1")

        # Deserializar social_networks de JSON a lista
        row_dict = dict(row)
        row_dict["social_networks"] = json.loads(row_dict.get("social_networks") or "[]")

        return BusinessInfo.model_validate(row_dict)

    async def update_business_info(self, updates: BusinessInfoUpdate) -> BusinessInfo:
        """
        Actualiza parcial o totalmente la información del negocio.
        """
        # .model_dump(exclude_unset=True) envía *solo* los campos que
        # el frontend envió (ej. solo el logo_url).
        updates_dict = updates.model_dump(exclude_unset=True)

        if not updates_dict:
            logger.warning("Actualización de BusinessInfo llamada sin datos.")
            return await self.get_business_info()

        # Serializar social_networks si se está actualizando
        if "social_networks" in updates_dict:
            updates_dict["social_networks"] = json.dumps(updates_dict["social_networks"])

        # Remove host and port from logo_url and icon_url
        if "logo_url" in updates_dict and updates_dict["logo_url"]:
            updates_dict["logo_url"] = self._sanitize_url(updates_dict["logo_url"])
        if "icon_url" in updates_dict and updates_dict["icon_url"]:
            updates_dict["icon_url"] = self._sanitize_url(updates_dict["icon_url"])
        if "banner_url" in updates_dict and updates_dict["banner_url"]:
            updates_dict["banner_url"] = self._sanitize_url(updates_dict["banner_url"])

        # Añadir timestamp
        updates_dict["updated_at"] = datetime.now().isoformat()

        # Construir query dinámicamente
        set_clause_parts = [f"{key} = ?" for key in updates_dict.keys()]
        params = list(updates_dict.values())
        params.append(1)  # para WHERE id = 1

        query = f"UPDATE business_info SET {', '.join(set_clause_parts)} WHERE id = ?"

        try:
            await self.db_manager.execute("business", query, tuple(params))
            logger.info(f"Información del negocio actualizada con {len(updates_dict)} campos.")
            return await self.get_business_info()
        except Exception as e:
            logger.error(f"Error al actualizar business_info: {e}", exc_info=True)
            raise ValueError(f"Error al actualizar la base de datos: {e}") from e

    async def upload_social_network_icon(
        self, network_index: int, file_data: bytes, original_filename: str
    ) -> BusinessInfo:
        """
        Sube un icono para una red social específica y actualiza la BD.
        """
        info = await self.get_business_info()
        social_networks = info.social_networks

        if not (0 <= network_index < len(social_networks)):
            raise ValueError("Índice de red social fuera de rango.")

        # Guardar la nueva imagen
        image_url = self.image_service.process_and_save(
            file_data=file_data,
            original_filename=original_filename,
            save_filename=f"social_{network_index}_{datetime.now().timestamp()}",
            folder="icons",
            max_size=(64, 64),
        )

        # Borrar la imagen anterior si existía
        old_icon = social_networks[network_index].get("icon")
        if old_icon:
            self.image_service.delete_image(old_icon)

        # Actualizar la URL del icono en la lista
        social_networks[network_index]["icon"] = image_url

        # Crear el DTO de actualización y guardar
        update_dto = BusinessInfoUpdate(social_networks=social_networks)
        return await self.update_business_info(update_dto)

    def _sanitize_url(self, url: str) -> str:
        """Helper para limpiar la URL antes de guardarla."""
        if "/uploads/" in url:
            return "/uploads/" + url.split("/uploads/")[1]
        return url

    async def _ensure_row_exists(self):
        """Método privado para asegurar que la fila id=1 exista"""
        await self.db_manager.execute(
            "business",
            "INSERT OR IGNORE INTO business_info (id, updated_at) VALUES (?, ?)",
            (1, datetime.now().isoformat()),
        )
        await self.db_manager.commit("business")
