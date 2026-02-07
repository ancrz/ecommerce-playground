import logging
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from pydantic import BaseModel

from ..database.manager import DatabaseManager
from ..models import Region, TaxRate

logger = logging.getLogger(__name__)


class TaxBreakdown(BaseModel):
    """Detalle de impuestos calculados."""

    subtotal: Decimal
    vat_amount: Decimal  # IVA (Calculado de tasas regionales)
    igtf_amount: Decimal  # IGTF (Calculado de moneda)
    total_tax: Decimal  # IVA + IGTF
    total: Decimal  # Subtotal + Impuestos
    breakdown: list[dict[str, Any]] = []  # Detalle por tasa


class TaxService:
    """
    Servicio para operaciones de impuestos regionales y cálculo fiscal (Venezuela).
    Unifica CRUD de regiones/tasas con lógica de cálculo IVA + IGTF.
    """

    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        logger.info("TaxService inicializado (Modo Híbrido: CRUD + Fiscal Venezuela).")

    # --- Administración de Regiones ---

    async def create_region(
        self, name: str, country: str, state: str, city: str | None = None, zip_code: str | None = None
    ) -> Region:
        """Crea una nueva región fiscal (ej. Caracas, Miranda)"""

        region = Region(name=name, country=country, state=state, city=city, zip_code=zip_code)

        try:
            await self.db_manager.execute(
                "tax",
                """
                INSERT INTO regions (id, name, country, state, city, zip_code, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    region.id,
                    region.name,
                    region.country,
                    region.state,
                    region.city,
                    region.zip_code,
                    region.is_active,
                    region.created_at.isoformat(),
                    region.updated_at.isoformat(),
                ),
            )
            logger.info(f"Región fiscal creada: {name}")
            return region
        except Exception as e:
            logger.error(f"Error al crear región {name}: {e}", exc_info=True)
            raise ValueError(f"Error creando región (¿nombre duplicado?): {str(e)}")

    async def get_regions(self, active_only: bool = True) -> list[Region]:
        """Obtiene todas las regiones fiscales"""
        query = "SELECT * FROM regions"
        if active_only:
            query += " WHERE is_active = 1"
        query += " ORDER BY name"

        rows = await self.db_manager.fetchall("tax", query)
        regions = [self._row_to_region(row) for row in rows]
        return [r for r in regions if r is not None]

    async def get_region(self, region_id: str) -> Region | None:
        """Obtiene una región por ID"""
        row = await self.db_manager.fetchone("tax", "SELECT * FROM regions WHERE id = ?", (region_id,))
        return self._row_to_region(row) if row else None

    async def update_region(self, region_id: str, updates: dict[str, Any]) -> Region | None:
        """Actualiza los campos de una región fiscal."""
        allowed_fields = ["name", "country", "state", "city", "zip_code", "is_active"]

        filtered_updates = {key: val for key, val in updates.items() if key in allowed_fields}

        if not filtered_updates:
            raise ValueError("No se proporcionaron campos válidos para actualizar.")

        filtered_updates["updated_at"] = datetime.now().isoformat()

        set_clause = ", ".join([f"{key} = ?" for key in filtered_updates.keys()])
        params = list(filtered_updates.values())
        params.append(region_id)

        await self.db_manager.execute("tax", f"UPDATE regions SET {set_clause} WHERE id = ?", tuple(params))
        logger.info(f"Región {region_id} actualizada.")
        return await self.get_region(region_id)

    async def delete_region(self, region_id: str) -> dict[str, str]:
        """
        Desactiva (Soft Delete) una región y todas sus tasas asociadas.
        No elimina, para mantener la integridad histórica de las Ventas.
        """
        await self.db_manager.execute(
            "tax",
            "UPDATE regions SET is_active = 0, updated_at = ? WHERE id = ?",
            (datetime.now().isoformat(), region_id),
        )
        await self.db_manager.execute(
            "tax",
            "UPDATE tax_rates SET is_active = 0, updated_at = ? WHERE region_id = ?",
            (datetime.now().isoformat(), region_id),
        )
        logger.info(f"Región {region_id} y sus tasas asociadas han sido desactivadas.")
        return {"message": "Región desactivada exitosamente."}

    # --- Administración de Tasas de Impuesto ---

    async def create_tax_rate(self, name: str, region_id: str, rate: Decimal, priority: int = 1) -> TaxRate:
        """
        Crea una nueva tasa de impuesto (ej. "IVA General", 0.16)
        y la vincula a una región.
        """
        region = await self.get_region(region_id)
        if not region:
            raise ValueError(f"La región con ID {region_id} no existe.")

        if not (Decimal("0") <= rate < Decimal("1")):
            raise ValueError("La tasa (rate) debe ser un decimal entre 0 y 1 (ej: 0.16 para 16%).")

        tax_rate = TaxRate(name=name, region_id=region_id, rate=rate, priority=priority)

        try:
            await self.db_manager.execute(
                "tax",
                """
                INSERT INTO tax_rates (id, name, region_id, rate, priority, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    tax_rate.id,
                    tax_rate.name,
                    tax_rate.region_id,
                    float(tax_rate.rate),
                    tax_rate.priority,
                    tax_rate.is_active,
                    tax_rate.created_at.isoformat(),
                    tax_rate.updated_at.isoformat(),
                ),
            )
            logger.info(f"Tasa de impuesto creada: {name} ({rate * 100}%) para la región {region.name}")
            return tax_rate
        except Exception as e:
            logger.error(f"Error al crear tasa de impuesto {name}: {e}", exc_info=True)
            raise ValueError(f"Error calculando impuestos: {str(e)}") from e

    async def get_tax_rates_for_region(self, region_id: str) -> list[TaxRate]:
        """Obtiene todas las tasas de impuesto activas para una región."""
        rows = await self.db_manager.fetchall(
            "tax", "SELECT * FROM tax_rates WHERE region_id = ? AND is_active = 1 ORDER BY priority", (region_id,)
        )
        rates = [self._row_to_tax_rate(row) for row in rows]
        return [r for r in rates if r is not None]

    async def get_tax_rate(self, tax_rate_id: str) -> TaxRate | None:
        """Obtiene una tasa de impuesto específica por ID"""
        row = await self.db_manager.fetchone("tax", "SELECT * FROM tax_rates WHERE id = ?", (tax_rate_id,))
        return self._row_to_tax_rate(row) if row else None

    async def update_tax_rate(self, tax_rate_id: str, updates: dict[str, Any]) -> TaxRate | None:
        """Actualiza los campos de una tasa de impuesto."""
        allowed_fields = ["name", "rate", "priority", "is_active"]

        filtered_updates = {key: val for key, val in updates.items() if key in allowed_fields}

        if "rate" in filtered_updates:
            rate = Decimal(str(filtered_updates["rate"]))
            if not (Decimal("0") <= rate < Decimal("1")):
                raise ValueError("La tasa (rate) debe ser un decimal entre 0 y 1.")
            filtered_updates["rate"] = float(rate)

        if not filtered_updates:
            raise ValueError("No se proporcionaron campos válidos para actualizar.")

        filtered_updates["updated_at"] = datetime.now().isoformat()

        set_clause = ", ".join([f"{key} = ?" for key in filtered_updates.keys()])
        params = list(filtered_updates.values())
        params.append(tax_rate_id)

        await self.db_manager.execute("tax", f"UPDATE tax_rates SET {set_clause} WHERE id = ?", tuple(params))
        logger.info(f"Tasa de impuesto {tax_rate_id} actualizada.")
        return await self.get_tax_rate(tax_rate_id)

    async def delete_tax_rate(self, tax_rate_id: str) -> dict[str, str]:
        """
        Desactiva (Soft Delete) una tasa de impuesto.
        """
        await self.db_manager.execute(
            "tax",
            "UPDATE tax_rates SET is_active = 0, updated_at = ? WHERE id = ?",
            (datetime.now().isoformat(), tax_rate_id),
        )
        logger.info(f"Tasa de impuesto {tax_rate_id} ha sido desactivada.")
        return {"message": "Tasa de impuesto desactivada exitosamente."}

    # --- Motor de Cálculo de Impuestos ---

    async def calculate_taxes(self, subtotal: Decimal, region_id: str | None, currency_id: str | None) -> TaxBreakdown:
        """
        Calcula el impuesto total considerando:
        1. Tasas Regionales (IVA) -> Basado en region_id
        2. Impuesto a la Moneda (IGTF) -> Basado en currency_id
        """

        # Valores por defecto
        vat_amount = Decimal("0")
        igtf_amount = Decimal("0")
        breakdown = []

        # 1. Calcular Impuestos Regionales (IVA)
        if region_id:
            rates = await self.get_tax_rates_for_region(region_id)
            for rate in rates:
                # Calcular monto de este impuesto
                amount = rate.calculate(subtotal)
                vat_amount += amount

                breakdown.append(
                    {"name": rate.name, "rate": float(rate.rate), "amount": float(amount), "type": "region"}
                )

        # 2. Calcular Impuesto a la Moneda (IGTF)
        if currency_id:
            # Buscar la moneda para ver su tax_rate
            # Usamos el chunk 'finance' donde están las currencies
            row = await self.db_manager.fetchone(
                "finance", "SELECT tax_rate FROM currencies WHERE id = ?", (currency_id,)
            )

            if row and row.get("tax_rate"):
                # tax_rate viene como float/decimal desde DB
                currency_tax_rate = Decimal(str(row["tax_rate"]))

                if currency_tax_rate > 0:
                    # Lógica IGTF: Se aplica sobre el monto TOTAL a pagar (Subtotal + IVA)
                    # Si el pago es en divisas, el IGTF es sobre el total de la operación.
                    base_for_igtf = subtotal + vat_amount
                    # El tax_rate en DB se asume porcentual o decimal?
                    # El modelo Currency dice tax_rate Decimal default 0.
                    # Si guardamos 0.03 (3%) o 3.0?
                    # Asumiremos que se guarda como Decimal puro (ej. 0.03) para consistencia con TaxRate.
                    # Sin embargo, si entra como 3.0 en UI, hay que ver.
                    # Por seguridad, si es > 1, dividimos entre 100? No, confiemos en el input.

                    amount_igtf = base_for_igtf * currency_tax_rate
                    igtf_amount += amount_igtf

                    breakdown.append(
                        {
                            "name": f"IGTF ({currency_id})",
                            "rate": float(currency_tax_rate),
                            "amount": float(amount_igtf),
                            "type": "currency",
                        }
                    )

        total_tax = vat_amount + igtf_amount
        total = subtotal + total_tax

        return TaxBreakdown(
            subtotal=subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            vat_amount=vat_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            igtf_amount=igtf_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            total_tax=total_tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            total=total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            breakdown=breakdown,
        )

    # --- Conversores de Fila (Row) a Modelo (Pydantic) ---

    def _row_to_region(self, row: dict) -> Region | None:
        if not row:
            return None
        try:
            return Region.model_validate(row)
        except Exception as e:
            logger.error(f"Error al validar fila de región: {e}. Fila: {row}", exc_info=True)
            return None

    def _row_to_tax_rate(self, row: dict) -> TaxRate | None:
        if not row:
            return None
        try:
            return TaxRate.model_validate(row)
        except Exception as e:
            logger.error(f"Error al validar fila de tasa de impuesto: {e}. Fila: {row}", exc_info=True)
            return None
