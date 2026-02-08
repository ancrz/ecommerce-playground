"""
Servicio de Gestión de Imágenes
REFACTORIZADO: Este es un servicio "puro" (utility).
No tiene estado ni dependencias de base de datos.
Su única responsabilidad es procesar y guardar archivos físicos.
"""

import logging
import os
import uuid
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

class ImageService:
    """
    Servicio para procesar, validar y guardar imágenes.
    Cumple con: "resolver la complejidad al momento de cargar las imágenes"
    """

    # Configuración de procesamiento
    DEFAULT_MAX_SIZE = (1200, 1200)  # Imagen full para landing/detalle
    THUMBNAIL_SIZE = (300, 300)      # Thumbnail para lista de productos
    LOGO_MAX_SIZE = (400, 200)       # Rectangular
    ICON_MAX_SIZE = (256, 256)       # Cuadrado
    MODULE_ICON_MAX_SIZE = (64, 64)  # Cuadrado pequeño

    DEFAULT_QUALITY = 85    # Calidad JPEG full
    THUMBNAIL_QUALITY = 75  # Calidad JPEG thumbnail (menor tamaño)
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}

    def __init__(self, upload_path: str = "./data/uploads"):
        """
        Inicializa el servicio con la ruta base de 'uploads'.
        Crea las subcarpetas requeridas.
        """
        self.upload_path = Path(upload_path)
        self.products_path = self.upload_path / "products"
        self.logos_path = self.upload_path / "logos"
        self.icons_path = self.upload_path / "icons"

        self.backend_host = os.getenv("BACKEND_HOST", "http://localhost")
        self.backend_port = os.getenv("BACKEND_PORT", "8042")

        try:
            for path in [self.products_path, self.logos_path, self.icons_path]:
                path.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.error(f"No se pudieron crear las carpetas de 'uploads': {e}", exc_info=True)
            raise

    def _validate_image(self, file_data: bytes, filename: str) -> bool:
        """Validar que el archivo sea una imagen válida"""
        try:
            ext = Path(filename).suffix.lower()
            if ext not in self.ALLOWED_EXTENSIONS:
                raise ValueError(f"Extensión no permitida. Use: {', '.join(self.ALLOWED_EXTENSIONS)}")

            # Intenta abrir la imagen para verificar que no esté corrupta
            Image.open(BytesIO(file_data)).verify()
            return True
        except Exception as e:
            logger.warning(f"Validación de imagen fallida para '{filename}': {e}")
            raise ValueError(f"Archivo no válido o corrupto: {str(e)}") from e

    def _process_image(
        self,
        file_data: bytes,
        max_size: tuple[int, int],
        fit_contain: bool = True # True = Contain (Logos), False = Cover (Products)
    ) -> Image.Image:
        """
        Procesa la imagen: la convierte a RGB y la redimensiona.
        """
        image = Image.open(BytesIO(file_data))

        # Convertir RGBA/LA/P a RGB (para guardar como JPEG)
        if image.mode in ('RGBA', 'LA', 'P'):
            # Crear fondo blanco
            background = Image.new('RGB', image.size, (255, 255, 255))

            if image.mode == 'P':
                image = image.convert('RGBA')

            if image.mode in ('RGBA', 'LA'):
                mask = image.split()[-1]
                background.paste(image, mask=mask)
            else:
                background.paste(image)

            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')

        # Redimensionar
        if fit_contain:
            # thumbnail() mantiene el aspect ratio y reduce si es más grande
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
        else:
            # ImageOps.fit() corta y centra (tipo 'cover')
            image = ImageOps.fit(image, max_size, Image.Resampling.LANCZOS)

        return image

    def process_and_save(
        self,
        file_data: bytes,
        original_filename: str,
        folder: str,
        save_filename: str | None = None,
        max_size: tuple[int, int] | None = None
    ) -> str:
        """
        Función principal: Valida, procesa y guarda una imagen en la carpeta
        de 'uploads' especificada y devuelve la URL completa.
        """
        # 1. Validar
        self._validate_image(file_data, original_filename)

        # 2. Determinar carpeta y configuración
        fit_contain = True
        if folder == "products":
            target_path = self.products_path
            max_size = max_size or self.DEFAULT_MAX_SIZE
            fit_contain = False # Cortar para que sean uniformes
        elif folder == "logos":
            target_path = self.logos_path
            max_size = max_size or self.LOGO_MAX_SIZE
        elif folder == "icons":
            target_path = self.icons_path
            max_size = max_size or self.ICON_MAX_SIZE
        elif folder == "module_icons":
            target_path = self.icons_path
            max_size = max_size or self.MODULE_ICON_MAX_SIZE
        else:
            raise ValueError(f"Carpeta de destino no válida: {folder}")

        # 3. Procesar
        image = self._process_image(file_data, max_size, fit_contain)

        # 4. Guardar
        if not save_filename:
            save_filename = str(uuid.uuid4())

        # Guardar siempre como JPEG optimizado
        final_filename = f"{save_filename}.jpg"
        filepath = target_path / final_filename

        try:
            image.save(
                filepath,
                'JPEG',
                quality=self.DEFAULT_QUALITY,
                optimize=True,
                progressive=True
            )
        except Exception as e:
            logger.error(f"Error al guardar imagen en disco: {e}", exc_info=True)
            raise OSError(f"No se pudo guardar la imagen: {e}") from e

        # 5. Retornar URL relativa para el proxy
        url_path = f"/uploads/{folder}/{final_filename}"
        logger.info(f"Imagen '{original_filename}' guardada. URL relativa: {url_path}")
        return url_path

    def process_and_save_multi_size(
        self,
        file_data: bytes,
        original_filename: str,
        save_filename: str,
        folder: str = "products"
    ) -> str:
        """
        Procesa y guarda una imagen en múltiples tamaños:
        - Full size (1200x1200): Para landing page y detalle de producto
        - Thumbnail (300x300): Para lista de productos y carrito

        Retorna la URL de la imagen full (el thumbnail se infiere como {id}_thumb.jpg)
        """
        # 1. Validar
        self._validate_image(file_data, original_filename)

        if folder != "products":
            # Para otros tipos, usar el método simple
            return self.process_and_save(file_data, original_filename, folder, save_filename)

        target_path = self.products_path

        # 2. Procesar imagen base (la abrimos una vez)
        image = Image.open(BytesIO(file_data))

        # Convertir a RGB si es necesario
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            if image.mode in ('RGBA', 'LA'):
                mask = image.split()[-1]
                background.paste(image, mask=mask)
            else:
                background.paste(image)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')

        # 3. Generar y guardar FULL SIZE (1200x1200)
        full_image = ImageOps.fit(image.copy(), self.DEFAULT_MAX_SIZE, Image.Resampling.LANCZOS)
        full_filename = f"{save_filename}.jpg"
        full_path = target_path / full_filename

        try:
            full_image.save(
                full_path,
                'JPEG',
                quality=self.DEFAULT_QUALITY,
                optimize=True,
                progressive=True
            )
            logger.info(f"Imagen FULL guardada: {full_path}")
        except Exception as e:
            logger.error(f"Error guardando imagen full: {e}", exc_info=True)
            raise OSError(f"No se pudo guardar imagen full: {e}") from e

        # 4. Generar y guardar THUMBNAIL (300x300)
        thumb_image = ImageOps.fit(image.copy(), self.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
        thumb_filename = f"{save_filename}_thumb.jpg"
        thumb_path = target_path / thumb_filename

        try:
            thumb_image.save(
                thumb_path,
                'JPEG',
                quality=self.THUMBNAIL_QUALITY,
                optimize=True
            )
            logger.info(f"Thumbnail guardado: {thumb_path}")
        except Exception as e:
            logger.error(f"Error guardando thumbnail: {e}", exc_info=True)
            # No es fatal, el producto puede funcionar sin thumbnail

        # 5. Retornar URL de la imagen full
        url_path = f"/uploads/{folder}/{full_filename}"
        logger.info(f"Imagen multi-size '{original_filename}' procesada. Full: {url_path}, Thumb: {thumb_filename}")
        return url_path

    def delete_image(self, image_url: str) -> bool:
        """
        Elimina una imagen del sistema de archivos usando su URL relativa.
        """
        if not image_url or not image_url.startswith('/uploads/'):
            logger.warning(f"Intento de eliminar URL de imagen no válida: {image_url}")
            return False

        try:
            # Convertir URL (ej: /uploads/products/abc.jpg)
            # a ruta de disco (ej: ./data/uploads/products/abc.jpg)
            relative_path = image_url.lstrip('/')
            filepath = self.upload_path.parent / relative_path

            if filepath.exists():
                filepath.unlink()
                logger.info(f"Imagen eliminada de disco: {filepath}")
                return True
            else:
                logger.warning(f"Se intentó eliminar una imagen que no existe: {filepath}")
                return False
        except Exception as e:
            logger.error(f"Error al eliminar imagen {image_url}: {e}", exc_info=True)
            return False
