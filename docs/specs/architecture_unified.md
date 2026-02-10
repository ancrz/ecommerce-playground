# Unified Architecture & Schema Integrity (v2.0)

**Date:** Feb 9, 2026  
**Status:** Stable  
**Context:** Migration from Fragmented SQLite Chunks to Unified SQLModel Architecture.

## 1. Core Philosophy: The Single Source of Truth

The system has transitioned from a fragmented architecture ("Database Chunks") to a **Unified Domain Model** governed by strict contracts.

-   **ORM:** [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic).
-   **Database:** SQLite in **WAL Mode** (Write-Ahead Logging) for high concurrency.
-   **Migrations:** [Alembic](https://alembic.sqlalchemy.org/) (Auto-generated from SQLModel definitions).

## 2. Structural Integrity (Backend <-> Frontend)

A major milestone was resolving the impedance mismatch between Python's `Decimal`/`datetime` and JavaScript's JSON/Zod expectations.

### 2.1 The Serialization Gap (Resolved)
*   **Problem:** Python `Decimal('10.00')` serializes to `string` by default in Pydantic v2/FastAPI, causing Frontend Zod schemas (`z.number()`) to crash.
*   **Solution:** Implemented explicit `@field_serializer` in domain models.

```python
# backend/models/finance.py
@field_serializer("exchange_rate", "tax_rate")
def serialize_decimal(self, v: Decimal, _info):
    return float(v)
```

### 2.2 Date Synchronization
All models inherit from `BaseEntity`, which enforces **ISO 8601** serialization for time fields, preventing "Invalid datetime" errors in the client.

## 3. Database Topology

### 3.1 Unified File
*   **Old:** `data/database/products.db`, `data/database/sales.db`, etc.
*   **New:** `data/database/ecommerce.db` (Single file).

### 3.2 Performance & Concurrency
*   **Mode:** WAL (Write-Ahead Logging).
*   **Benchmark:** ~2600 ops/sec (Read + Write) with 20 concurrent workers.
*   **Deadlocks:** 0 (Validated via `scripts/stress_test.py`).

## 4. Key Schema Changes

### 4.1 Sales & Carts (Tax Transparency)
Added fields to support **IGTF (Impuesto a las Grandes Transacciones Financieras)** transparency before checkout:

| Field | Type | Description |
|-------|------|-------------|
| `igtf_amount` | `Decimal` | The monetary tax amount (e.g., 3% for USD). |
| `invoice_status` | `str` | Tracking for async billing generation (`pending`, `generated`). |
| `invoice_retry_count` | `int` | Resilience mechanism for billing failures. |

## 5. Development Pipeline

The workflow is now orchestrated via `dev_pipeline.py`:

```bash
# Full integrity check: Linting + Migration + Sync
python dev_pipeline.py --lint --migrate
```
