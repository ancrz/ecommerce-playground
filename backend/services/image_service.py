"""
Servicio de Gestión de Imágenes
REFACTORIZADO: Este es un servicio "puro" (utility).
No tiene estado ni dependencias de base de datos.
Su única responsabilidad es procesar y guardar archivos físicos.
"""

import os
import logging
from pathlib import Path
from PIL import Image, ImageOps
from io import BytesIO
import uuid
from typing import Optional, Tuple, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class ImageService:
    """
    Servicio para procesar, validar y guardar imágenes.
    Cumple con: "resolver la complejidad al momento de cargar las imágenes"
    """
    
    # Configuración de procesamiento
    DEFAULT_MAX_SIZE = (1200, 1200)
    LOGO_MAX_SIZE = (400, 200) # Rectangular
    ICON_MAX_SIZE = (256, 256) # Cuadrado
    MODULE_ICON_MAX_SIZE = (64, 64) # Cuadrado pequeño
    
    DEFAULT_QUALITY = 85 # Calidad JPEG
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
        self.backend_port = os.getenv("BACKEND_PORT", "8000")

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
            raise ValueError(f"Archivo no válido o corrupto: {str(e)}")
    
    def _process_image(
        self, 
        file_data: bytes, 
        max_size: Tuple[int, int],
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
        save_filename: Optional[str] = None,
        max_size: Optional[Tuple[int, int]] = None
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
            raise IOError(f"No se pudo guardar la imagen: {e}")
        
        # 5. Retornar URL relativa para el proxy
        url_path = f"/uploads/{folder}/{final_filename}"
        logger.info(f"Imagen '{original_filename}' guardada. URL relativa: {url_path}")
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