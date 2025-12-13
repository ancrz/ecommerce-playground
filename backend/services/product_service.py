"""
Servicio de gestión de productos
REFACTORIZADO: 'update_stock' ahora es atómico para prevenir 'race conditions'.
"""

from typing import List, Optional, Dict, Any
from decimal import Decimal
import logging
from datetime import datetime

from ..models.base import Product, ProductCard
from ..database.manager import DatabaseManager

logger = logging.getLogger(__name__)


class ProductService:
    """Servicio para operaciones con productos"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        logger.info("ProductService inicializado.")
    
    async def create_product(self, product: Product) -> Product:
        """Crear nuevo producto"""
        try:
            await self.db_manager.execute("products", """
                INSERT INTO products (
                    id, name, description, sku, price, stock, category,
                    image_url, is_featured, is_discount, discount_percentage,
                    banner_assignment, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
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
                product.updated_at.isoformat()
            ))
            logger.info(f"Producto creado en la base de datos: {product.id}")
            # REFACTOR: Devolver el producto desde la BD para asegurar consistencia
            return await self.get_product(product.id)
        except Exception as e:
            logger.error(f"Error al crear producto {product.name}: {e}", exc_info=True)
            raise ValueError(f"Error creando producto (¿SKU duplicado?): {str(e)}")
    
    async def get_product(self, product_id: str) -> Optional[Product]:
        """Obtener producto por ID"""
        row = await self.db_manager.fetchone(
            "products",
            "SELECT * FROM products WHERE id = ?",
            (product_id,)
        )
        return self._row_to_product(row) if row else None
    
    async def get_all_products(
        self,
        category: Optional[str] = None,
        featured_only: bool = False,
        discount_only: bool = False
    ) -> List[Product]:
        """Obtener todos los productos con filtros opcionales"""
        query = "SELECT * FROM products WHERE 1=1"
        params = []
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        if featured_only:
            query += " AND is_featured = 1"
        
        if discount_only:
            query += " AND is_discount = 1"
        
        query += " ORDER BY created_at DESC"
        
        rows = await self.db_manager.fetchall("products", query, tuple(params))
        logger.info(f"Obtenidos {len(rows)} productos con filtros: category={category}, featured={featured_only}, discount={discount_only}")
        
        products = []
        for row in rows:
            product = self._row_to_product(row)
            if product:
                products.append(product)
        return products
    
    async def update_product(self, product_id: str, updates: Dict[str, Any]) -> Optional[Product]:
        """
        Actualizar producto.
        REFACTOR: Más seguro. Solo permite actualizar campos específicos.
        """
        
        # Lista blanca de campos permitidos para actualización
        allowed_fields = [
            'name', 'description', 'sku', 'price', 'stock', 'category',
            'image_url', 'is_featured', 'is_discount', 'discount_percentage',
            'banner_assignment'
        ]
        
        # Filtrar el diccionario 'updates'
        filtered_updates = {key: val for key, val in updates.items() if key in allowed_fields}
        
        if not filtered_updates:
            logger.warning(f"Intento de actualización de producto {product_id} sin campos válidos.")
            return await self.get_product(product_id)

        # Convertir Decimal a float para SQL
        if 'price' in filtered_updates:
            filtered_updates['price'] = float(filtered_updates['price'])
        if 'discount_percentage' in filtered_updates:
            filtered_updates['discount_percentage'] = float(filtered_updates['discount_percentage'])

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
        except ValueError as e: # Captura el (posible) CHECK de stock
             logger.error(f"Error de integridad al actualizar producto {product_id}: {e}", exc_info=True)
             raise ValueError(f"Error actualizando producto (¿stock negativo o SKU duplicado?): {str(e)}")
        except Exception as e:
            logger.error(f"Error al actualizar producto {product_id}: {e}", exc_info=True)
            raise ValueError(f"Error actualizando producto: {str(e)}")
    
    async def delete_product(self, product_id: str) -> bool:
        """Eliminar producto"""
        try:
            await self.db_manager.execute(
                "products",
                "DELETE FROM products WHERE id = ?",
                (product_id,)
            )
            logger.info(f"Producto {product_id} eliminado de la base de datos.")
            return True
        except Exception as e:
            logger.error(f"Error al eliminar producto {product_id}: {e}", exc_info=True)
            raise ValueError(f"Error eliminando producto: {str(e)}")
    
    async def search_products(self, query: str) -> List[Product]:
        """Buscar productos por nombre o descripción"""
        search_term = f"%{query}%"
        rows = await self.db_manager.fetchall("products", """
            SELECT * FROM products 
            WHERE name LIKE ? OR description LIKE ? OR sku LIKE ? OR category LIKE ?
            ORDER BY name
        """, (search_term, search_term, search_term, search_term))
        logger.info(f"Búsqueda de productos '{query}' en el servicio. Resultados: {len(rows)}")
        return [self._row_to_product(row) for row in rows]
    
    async def get_products_for_slider(self, slider_type: str = "main") -> List[ProductCard]:
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
                (quantity_change, product_id)
            )
            logger.info(f"Stock atómico actualizado para {product_id}. Cambio: {quantity_change}")
            return True
        except ValueError as e:
            # Captura el 'IntegrityError' (CHECK(stock >= 0))
            logger.error(f"Error de STOCK INSUFICIENTE para {product_id} (quería {quantity_change}): {e}", exc_info=True)
            raise ValueError(f"Stock insuficiente para el producto (ID: {product_id}).")
        except Exception as e:
            logger.error(f"Error genérico en update_stock para {product_id}: {e}", exc_info=True)
            raise ValueError(f"Error al actualizar stock: {e}")
    
    def _row_to_product(self, row: Dict) -> Optional[Product]:
        """Convertir fila de BD (dict) a objeto Product"""
        if not row:
            return None
        try:
            return Product.model_validate(row)
        except Exception as e:
            logger.error(f"Error al validar fila de producto: {e}. Fila: {row}", exc_info=True)
            return None