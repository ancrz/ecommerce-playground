"""
Servicio de gestión de productos
REFACTORIZADO: 'update_stock' ahora es atómico para prevenir 'race conditions'.
"""

import logging
from datetime import datetime
from typing import Any

from ..database.manager import DatabaseManager
from ..models import Product, ProductCard

logger = logging.getLogger(__name__)


class ProductService:
    """Servicio para operaciones con productos"""

    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        logger.info("ProductService inicializado.")

    async def create_product(self, product: Product) -> Product:
        """Crear nuevo producto"""
        try:
            await self.db_manager.execute(
                "products",
                """
                INSERT INTO products (
                    id, name, description, sku, price, stock, category,
                    image_url, is_featured, is_discount, discount_percentage,
                    banner_assignment, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    product.id,
                    product.name,
                    product.description,
                    product.sku,
                    float(product.price),
                    product.stock,
                    product.category,
                    product.image_url,
                    product.is_featured,
                    product.is_discount,
                    float(product.discount_percentage),
                    product.banner_assignment,
                    product.created_at.isoformat(),
                    product.updated_at.isoformat(),
                ),
            )
            logger.info(f"Producto creado en la base de datos: {product.id}")
            # REFACTOR: Devolver el producto desde la BD para asegurar consistencia
            created = await self.get_product(product.id)
            if not created:
                raise ValueError("Error recuperando el producto creado.")
            return created
        except Exception as e:
            logger.error(f"Error al crear producto {product.name}: {e}", exc_info=True)
            raise ValueError(f"Error creando producto (¿SKU duplicado?): {str(e)}") from e

    async def get_product(self, product_id: str) -> Product | None:
        """Obtener producto por ID"""
        row = await self.db_manager.fetchone("products", "SELECT * FROM products WHERE id = ?", (product_id,))
        return self._row_to_product(row) if row else None

    async def get_all_products(
        self,
        category: str | None = None,
        featured_only: bool = False,
        discount_only: bool = False,
        skip: int | None = None,
        limit: int | None = None,
    ) -> list[Product]:
        """Obtener todos los productos con filtros opcionales"""
        query = "SELECT * FROM products WHERE 1=1"
        params: list[Any] = []

        if category:
            query += " AND category = ?"
            params.append(category)

        if featured_only:
            query += " AND is_featured = 1"

        if discount_only:
            query += " AND is_discount = 1"

        query += " ORDER BY created_at DESC"

        # Aplicar paginación si se solicita
        if limit is not None and skip is not None:
            query += " LIMIT ? OFFSET ?"
            params.append(limit)
            params.append(skip)

        rows = await self.db_manager.fetchall("products", query, tuple(params))
        logger.info(
            f"Obtenidos {len(rows)} productos con filtros: category={category}, featured={featured_only}, discount={discount_only}"
        )

        products = []
        for row in rows:
            product = self._row_to_product(row)
            if product:
                products.append(product)
        return products

    async def update_product(self, product_id: str, updates: dict[str, Any]) -> Product | None:
        """
        Actualizar producto.
        REFACTOR: Más seguro. Solo permite actualizar campos específicos.
        """

        # Lista blanca de campos permitidos para actualización
        allowed_fields = [
            "name",
            "description",
            "sku",
            "price",
            "stock",
            "category",
            "image_url",
            "is_featured",
            "is_discount",
            "discount_percentage",
            "banner_assignment",
        ]

        # Filtrar el diccionario 'updates'
        filtered_updates = {key: val for key, val in updates.items() if key in allowed_fields}

        if not filtered_updates:
            logger.warning(f"Intento de actualización de producto {product_id} sin campos válidos.")
            return await self.get_product(product_id)

        # Convertir Decimal a float para SQL
        if "price" in filtered_updates:
            filtered_updates["price"] = float(filtered_updates["price"])
        if "discount_percentage" in filtered_updates:
            filtered_updates["discount_percentage"] = float(filtered_updates["discount_percentage"])

        # Construir query dinámicamente
        set_clause_parts = [f"{key} = ?" for key in filtered_updates.keys()]
        set_clause_parts.append("updated_at = ?")

        params = list(filtered_updates.values())
        params.append(datetime.now().isoformat())
        params.append(product_id)

        query = f"UPDATE products SET {', '.join(set_clause_parts)} WHERE id = ?"

        try:
            await self.db_manager.execute("products", query, tuple(params))
            logger.info(f"Producto {product_id} actualizado en la base de datos con {len(filtered_updates)} campos.")
            return await self.get_product(product_id)
        except ValueError as e:  # Captura el (posible) CHECK de stock
            logger.error(f"Error de integridad al actualizar producto {product_id}: {e}", exc_info=True)
            raise ValueError(f"Error actualizando producto (¿stock negativo o SKU duplicado?): {str(e)}") from e
        except Exception as e:
            logger.error(f"Error al actualizar producto {product_id}: {e}", exc_info=True)
            raise ValueError(f"Error actualizando producto: {e}") from e

    async def delete_product(self, product_id: str) -> bool:
        """Eliminar producto"""
        try:
            await self.db_manager.execute("products", "DELETE FROM products WHERE id = ?", (product_id,))
            logger.info(f"Producto {product_id} eliminado de la base de datos.")
            return True
        except Exception as e:
            logger.error(f"Error eliminando producto {product_id}: {e}", exc_info=True)
            raise ValueError(f"Error eliminando producto: {e}") from e

    async def search_products(self, query: str, limit: int = 20) -> list[Product]:
        """Buscar productos por nombre o descripción (limite por defecto 20 para POS)"""
        search_term = f"%{query}%"
        rows = await self.db_manager.fetchall(
            "products",
            """
            SELECT * FROM products
            WHERE name LIKE ? OR description LIKE ? OR sku LIKE ? OR category LIKE ?
            ORDER BY name
            LIMIT ?
        """,
            (search_term, search_term, search_term, search_term, limit),
        )
        logger.info(f"Búsqueda de productos '{query}' (limit={limit}). Resultados: {len(rows)}")
        products = [self._row_to_product(row) for row in rows]
        return [p for p in products if p]

    async def get_products_for_slider(self, slider_type: str = "main") -> list[ProductCard]:
        """Obtener productos para un slider específico"""
        if slider_type == "featured":
            products = await self.get_all_products(featured_only=True)
        elif slider_type == "discount":
            products = await self.get_all_products(discount_only=True)
        else:
            # El slider 'main' muestra todo (o podemos cambiar la lógica)
            products = await self.get_all_products()

        logger.info(f"Obtenidos {len(products)} productos para slider '{slider_type}'.")
        return [product.to_card() for product in products]

    async def update_stock(self, product_id: str, quantity_change: int) -> bool:
        """
        Actualizar stock de producto de forma atómica.
        REFACTORIZADO: Previene 'race conditions'.
        'quantity_change' es negativo para ventas (ej. -5)
        'quantity_change' es positivo para reposición (ej. +50)
        """
        try:
            # Operación atómica de SQL.
            # La base de datos hace el cálculo (stock = stock + (-5))
            await self.db_manager.execute(
                "products",
                """
                UPDATE products
                SET stock = stock + ?
                WHERE id = ?
                """,
                (quantity_change, product_id),
            )
            logger.info(f"Stock atómico actualizado para {product_id}. Cambio: {quantity_change}")

            # === [NEW] Evento de Real-Time (WebSocket & Webhook) ===
            try:
                # Recuperar nueva cantidad para informar
                product = await self.get_product(product_id)
                if product:
                    # Importación local para evitar dependencias circulares si las hubiera
                    from ..api.websocket import emit_product_out_of_stock, emit_stock_update
                    from ..services.webhook_service import WebhookEvents, emit_product_event

                    # 1. Emitir WebSocket Update
                    await emit_stock_update(product_id, product.stock, product.name)

                    # 2. Verificar Agotado
                    if product.stock <= 0:
                        await emit_product_out_of_stock(product_id, product.name)
                        # 3. Webhook (Integración ERP)
                        await emit_product_event(WebhookEvents.PRODUCT_OUT_OF_STOCK, product_id, product.name)

            except Exception as hook_error:
                # No bloquear la transacción por fallo de notificación
                logger.error(f"Error emitiendo eventos de stock: {hook_error}")

            return True
        except ValueError as e:
            # Captura el 'IntegrityError' (CHECK(stock >= 0))
            logger.error(
                f"Error de STOCK INSUFICIENTE para {product_id} (quería {quantity_change}): {e}", exc_info=True
            )
            raise ValueError(f"Stock insuficiente para el producto (ID: {product_id}).") from e
        except Exception as e:
            logger.error(f"Error genérico en update_stock para {product_id}: {e}", exc_info=True)
            raise ValueError(f"Error al actualizar stock: {e}") from e

    def _row_to_product(self, row: dict) -> Product | None:
        """Convertir fila de BD (dict) a objeto Product"""
        if not row:
            return None
        try:
            return Product.model_validate(row)
        except Exception as e:
            logger.error(f"Error al validar fila de producto: {e}. Fila: {row}", exc_info=True)
            return None

    # ==================== GALERÍA DE IMÁGENES ====================

    async def add_product_image(
        self,
        product_id: str,
        image_url: str,
        thumbnail_url: str | None = None,
        is_main: bool = False,
        alt_text: str | None = None,
    ) -> dict[str, Any]:
        """
        Añade una imagen a la galería de un producto.
        Si is_main=True, desmarca cualquier otra imagen como principal.
        """
        import uuid

        # Verificar que el producto existe
        product = await self.get_product(product_id)
        if not product:
            raise ValueError(f"Producto {product_id} no encontrado.")

        # Si es main, desmarcar las otras
        if is_main:
            await self.db_manager.execute(
                "products", "UPDATE product_images SET is_main = ? WHERE product_id = ?", (False, product_id)
            )
            # También actualizar la image_url principal del producto
            await self.update_product(product_id, {"image_url": image_url})

        # Obtener el siguiente display_order
        existing = await self.get_product_images(product_id)
        if len(existing) >= 5:
            # Ojo: Si estamos editando podríamos querer reemplazar, pero esta función es "add".
            # El frontend debe borrar antes o manejar el reemplazo.
            raise ValueError("El producto ha alcanzado el límite máximo de 5 imágenes.")

        next_order = len(existing)

        # Crear la imagen
        image_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        await self.db_manager.execute(
            "products",
            """
            INSERT INTO product_images (id, product_id, image_url, thumbnail_url, is_main, display_order, alt_text, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (image_id, product_id, image_url, thumbnail_url, is_main, next_order, alt_text, now),
        )

        logger.info(f"Imagen {image_id} añadida al producto {product_id}")

        return {
            "id": image_id,
            "product_id": product_id,
            "image_url": image_url,
            "thumbnail_url": thumbnail_url,
            "is_main": is_main,
            "display_order": next_order,
        }

    async def get_product_images(self, product_id: str) -> list[dict[str, Any]]:
        """Obtiene todas las imágenes de un producto ordenadas por display_order."""
        rows = await self.db_manager.fetchall(
            "products",
            """
            SELECT id, product_id, image_url, thumbnail_url, is_main, display_order, alt_text, created_at
            FROM product_images
            WHERE product_id = ?
            ORDER BY display_order ASC
            """,
            (product_id,),
        )
        return rows

    async def set_main_image(self, product_id: str, image_id: str) -> bool:
        """Establece una imagen como principal del producto."""
        # Desmarcar todas
        await self.db_manager.execute(
            "products", "UPDATE product_images SET is_main = ? WHERE product_id = ?", (False, product_id)
        )
        # Marcar la seleccionada
        await self.db_manager.execute(
            "products",
            "UPDATE product_images SET is_main = ? WHERE id = ? AND product_id = ?",
            (True, image_id, product_id),
        )

        # Obtener la URL de la imagen para actualizar el producto
        row = await self.db_manager.fetchone(
            "products", "SELECT image_url FROM product_images WHERE id = ?", (image_id,)
        )
        if row:
            await self.update_product(product_id, {"image_url": row["image_url"]})

        logger.info(f"Imagen {image_id} establecida como principal de producto {product_id}")
        return True

    async def delete_product_image(self, product_id: str, image_id: str) -> bool:
        """Elimina una imagen de la galería."""
        # Verificar si era la imagen principal
        row = await self.db_manager.fetchone(
            "products",
            "SELECT is_main, image_url FROM product_images WHERE id = ? AND product_id = ?",
            (image_id, product_id),
        )

        if not row:
            raise ValueError(f"Imagen {image_id} no encontrada para producto {product_id}")

        # Eliminar
        await self.db_manager.execute(
            "products", "DELETE FROM product_images WHERE id = ? AND product_id = ?", (image_id, product_id)
        )

        # Si era la principal, buscar otra para poner como principal
        if row.get("is_main"):
            remaining = await self.get_product_images(product_id)
            if remaining:
                await self.set_main_image(product_id, remaining[0]["id"])
            else:
                # No hay más imágenes, limpiar la del producto
                await self.update_product(product_id, {"image_url": None})

        logger.info(f"Imagen {image_id} eliminada del producto {product_id}")
        return True
