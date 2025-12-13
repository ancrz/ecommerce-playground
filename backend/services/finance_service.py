"""
Servicio financiero - Gestión de monedas y conversiones
REFACTORIZADO: Lógica de impuestos (tax_percentage) eliminada.
Este servicio ahora solo maneja Monedas y Conversiones.
"""

from typing import List, Optional, Dict, Any
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
import logging

# Importamos los modelos de base.py (Currency, NO TaxRate)
from ..models.base import Currency
from ..database.manager import DatabaseManager

logger = logging.getLogger(__name__)

class FinanceService:
    """
    Servicio para operaciones financieras.
    Implementa reglas de negocio estrictas para la moneda base (Lógica SAP).
    NO maneja impuestos.
    """
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        logger.info("FinanceService inicializado.")
    
    async def create_currency(
        self,
        name: str,
        symbol: str,
        is_base: bool = False,
        exchange_rate: Decimal = Decimal("1.0")
        # REFACTOR: tax_percentage eliminado
    ) -> Currency:
        """
        Crear nueva moneda.
        """
        
        # REGLA SAP: No se puede crear una moneda base si ya existe una.
        if is_base:
            base_currency = await self.get_base_currency()
            if base_currency:
                logger.warning(f"Intento de crear una segunda moneda base ({name})")
                raise ValueError(
                    f"Ya existe una moneda base ({base_currency.name}). "
                    "Debe cambiar la moneda base existente antes de crear una nueva."
                )
            exchange_rate = Decimal("1.0")
        
        currency = Currency(
            name=name,
            symbol=symbol,
            is_base=is_base,
            base_currency_id=None,
            exchange_rate=exchange_rate,
            is_active=True
            # tax_percentage eliminado
        )
        
        try:
            # REFACTOR: SQL actualizado sin tax_percentage
            await self.db_manager.execute("finance", """
                INSERT INTO currencies (
                    id, name, symbol, is_base, exchange_rate,
                    base_currency_id, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                currency.id,
                currency.name,
                currency.symbol,
                currency.is_base,
                float(currency.exchange_rate),
                currency.base_currency_id,
                currency.is_active,
                currency.created_at.isoformat(),
                currency.updated_at.isoformat()
            ))
            logger.info(f"Moneda creada: {name} (Base: {is_base})")
            return currency
        except Exception as e:
            logger.error(f"Error al crear moneda {name}: {e}", exc_info=True)
            raise ValueError(f"Error creando moneda (¿nombre o símbolo duplicado?): {str(e)}")
    
    async def get_currency(self, currency_id: str) -> Optional[Currency]:
        """Obtener moneda por ID"""
        row = await self.db_manager.fetchone(
            "finance",
            "SELECT * FROM currencies WHERE id = ? AND is_active = 1",
            (currency_id,)
        )
        return self._row_to_currency(row) if row else None
    
    async def get_all_currencies(self, active_only: bool = True) -> List[Currency]:
        """Obtener todas las monedas"""
        query = "SELECT * FROM currencies"
        if active_only:
            query += " WHERE is_active = 1"
        query += " ORDER BY is_base DESC, name"
        
        rows = await self.db_manager.fetchall("finance", query)
        return [self._row_to_currency(row) for row in rows]
    
    async def get_base_currency(self) -> Optional[Currency]:
        """Obtener moneda base activa"""
        row = await self.db_manager.fetchone(
            "finance",
            "SELECT * FROM currencies WHERE is_base = 1 AND is_active = 1 LIMIT 1"
        )
        return self._row_to_currency(row) if row else None
    
    async def update_exchange_rate(
        self,
        currency_id: str,
        new_rate: Decimal
    ) -> Optional[Currency]:
        """Actualizar tasa de cambio (solo para monedas no-base)"""
        currency = await self.get_currency(currency_id)
        if not currency:
            logger.warning(f"Intento de actualizar tasa de moneda inexistente: {currency_id}")
            return None
        
        # REGLA SAP: No se puede cambiar la tasa de la moneda base
        if currency.is_base:
            logger.error(f"Intento ILEGAL de cambiar tasa de moneda base: {currency.name}")
            raise ValueError("No se puede cambiar la tasa de la moneda base. La tasa es 1.0 por definición.")
        
        if new_rate <= 0:
            raise ValueError("La tasa de cambio debe ser positiva.")

        await self.db_manager.execute("finance", """
            UPDATE currencies 
            SET exchange_rate = ?, updated_at = ?
            WHERE id = ?
        """, (float(new_rate), datetime.now().isoformat(), currency_id))
        
        logger.info(f"Tasa de {currency.name} actualizada a {new_rate}")
        return await self.get_currency(currency_id)
    
    # REFACTOR: set_tax_percentage FUE ELIMINADO.
    
    async def delete_currency(self, currency_id: str) -> Dict[str, any]:
        """
        Desactivar moneda (Soft Delete).
        REGLA SAP: Bloquea el borrado de la moneda base.
        """
        currency = await self.get_currency(currency_id)
        if not currency:
            raise ValueError("Moneda no encontrada")
        
        if currency.is_base:
            logger.error(f"Intento ILEGAL de eliminar moneda base: {currency.name}")
            raise ValueError(
                "No se puede eliminar la moneda base. "
                "Debe asignar una nueva moneda base primero."
            )
        
        await self.db_manager.execute("finance", """
            UPDATE currencies SET is_active = 0, updated_at = ? WHERE id = ?
        """, (datetime.now().isoformat(), currency_id))
        
        logger.info(f"Moneda desactivada: {currency.name} (ID: {currency_id})")
        return {
            "success": True,
            "message": f"Moneda '{currency.name}' desactivada exitosamente."
        }

    async def set_base_currency(self, new_base_currency_id: str) -> Dict[str, any]:
        """
        Define una nueva moneda base y recalcula todas las demás tasas en relación a ella.
        Esta es la "migración controlada" que cumple con la lógica SAP.
        """
        logger.warning(f"INICIANDO MIGRACIÓN DE MONEDA BASE a {new_base_currency_id}")
        
        new_base = await self.get_currency(new_base_currency_id)
        
        if not new_base:
            raise ValueError("La nueva moneda base no existe.")
        if new_base.is_base:
            return {"message": "Esta ya es la moneda base.", "success": True}
        
        # Tasa de la nueva base (ej. 36.5, si 1 USD = 36.5 Bs)
        conversion_factor = new_base.exchange_rate
        if conversion_factor == 0:
            raise ValueError("La tasa de la nueva moneda base no puede ser 0.")

        all_currencies = await self.get_all_currencies(active_only=True)
        
        # Recalcular todas las tasas (incluida la antigua base)
        # Nueva Tasa = Tasa Antigua / Factor de Conversión
        for currency in all_currencies:
            old_rate = currency.exchange_rate
            new_rate = old_rate / conversion_factor
            
            await self.db_manager.execute("finance", """
                UPDATE currencies 
                SET exchange_rate = ?, is_base = ?, updated_at = ?
                WHERE id = ?
            """, (
                float(new_rate.quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)), # Alta precisión para tasas
                currency.id == new_base_currency_id, # Poner is_base=True solo a la nueva
                datetime.now().isoformat(),
                currency.id
            ))
            logger.info(f"Moneda {currency.name} recalculada: {old_rate} -> {new_rate}")

        logger.warning(f"MIGRACIÓN DE MONEDA BASE COMPLETADA. Nueva base: {new_base.name}")
        
        return {
            "success": True,
            "message": f"Moneda base cambiada a {new_base.name}. Todas las tasas han sido recalculadas."
        }
    
    async def convert_price_to_currency(
        self,
        amount_in_base: Decimal,
        to_currency_id: str
    ) -> Dict[str, Any]:
        """
        Convierte un precio (en Moneda Base) a una moneda destino.
        REFACTORIZADO: Ya no maneja impuestos, solo conversión pura.
        """
        target_currency = await self.get_currency(to_currency_id)
        base_currency = await self.get_base_currency()
        
        if not target_currency or not base_currency:
            logger.error(f"Error de conversión: Moneda base o destino no encontrada.")
            raise ValueError("Moneda de conversión no encontrada.")
        
        # Usar el método del modelo (base.py) para convertir
        converted_amount = target_currency.convert_from_base(amount_in_base)
        
        return {
            "original_amount_base": amount_in_base,
            "original_symbol_base": base_currency.symbol,
            "converted_amount": converted_amount,
            "target_symbol": target_currency.symbol,
            "exchange_rate": target_currency.exchange_rate
        }
    
    def _row_to_currency(self, row: Dict) -> Optional[Currency]:
        """Convierte una fila de la DB (dict) al modelo Pydantic Currency"""
        if not row:
            return None
        try:
            # REFACTOR: model_validate es el método Pydantic v2 (en lugar de from_orm)
            return Currency.model_validate(row)
        except Exception as e:
            logger.error(f"Error al validar fila de moneda: {e}. Fila: {row}", exc_info=True)
            return None