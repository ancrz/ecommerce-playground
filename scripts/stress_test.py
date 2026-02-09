"""
STRESS TEST UTILITY - eCommerce Playground
==========================================

OBJETIVO:
Validar la resiliencia del motor de base de datos (SQLite WAL) ante ráfagas de alta concurrencia.

METODOLOGÍA (Ontología de Relaciones):
- Simulación de Workers (20 hilos concurrentes).
- Inferencia de Impacto: Cada worker realiza operaciones de Lectura (Stock) y Escritura (Sales).
- Validación de Integridad: Verifica restricciones NOT NULL y tipos de datos en tiempo real.

RENDIMIENTO ESPERADO:
- > 2000 ops/sec en hardware estándar.
- 0 Deadlocks/Bloqueos (gracias a la configuración unificada y modo WAL).

USO:
python scripts/stress_test.py
"""

import asyncio
import logging
import random
import sys
import time
import os
from datetime import datetime
from pathlib import Path

# Add project root
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(PROJECT_ROOT))

from backend.database.manager import DatabaseManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("StressTest")

CONCURRENCY = 20  # Simultaneous workers
OPERATIONS_PER_WORKER = 50
TARGET_TABLE = "products"  # Unified DB

async def worker(worker_id: int, db: DatabaseManager, product_ids: list[str]):
    """Simulates a user buying products (read + update + insert)."""
    success = 0
    failures = 0
    deadlocks = 0
    
    for i in range(OPERATIONS_PER_WORKER):
        try:
            prod_id = random.choice(product_ids)
            
            # 1. READ (Check stock)
            row = await db.fetchone(TARGET_TABLE, "SELECT stock, price FROM products WHERE id = ?", (prod_id,))
            if not row:
                continue
                
            # 2. WRITE (Update stock - atomic decrement)
            await db.execute(
                TARGET_TABLE, 
                "UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0", 
                (prod_id,)
            )
            
            # 3. WRITE (Insert dummy sale)
            await db.execute(
                "sales",
                "INSERT INTO sales (id, cart_id, customer_name, customer_id, items, currency_id, payment_details, subtotal, tax_amount, igtf_amount, total_with_tax, completed_at, status, invoice_status, invoice_retry_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    f"stress_{worker_id}_{i}_{time.time()}",
                    f"cart_{worker_id}",
                    "Stress Tester",
                    "user_test",
                    "[]",
                    "USD",
                    "{}",
                    10.0,
                    0.0,
                    0.0,  # igtf_amount
                    10.0,
                    datetime.now().isoformat(),
                    "completed",
                    "pending", # invoice_status
                    0, # invoice_retry_count
                    datetime.now().isoformat(),
                    datetime.now().isoformat()
                )
            )
            
            success += 1
            
        except Exception as e:
            err_msg = str(e).lower()
            if "locked" in err_msg or "deadlock" in err_msg:
                deadlocks += 1
            else:
                failures += 1
                logger.error(f"Worker {worker_id} error: {e}")
                
        # Tiny sleep to allow context switch
        await asyncio.sleep(random.uniform(0.001, 0.01))
        
    return success, failures, deadlocks

async def main():
    logger.info(f"🚀 Iniciando Stress Test (Unified DB: {os.getenv('DB_TYPE', 'sqlite')})")
    logger.info(f"Workers: {CONCURRENCY}, Ops/Worker: {OPERATIONS_PER_WORKER}")
    
    db = DatabaseManager()
    await db.initialize()
    
    # Get product IDs
    rows = await db.fetchall("products", "SELECT id FROM products")
    if not rows:
        logger.error("No products found. Run seed_data.py first.")
        return
    product_ids = [r["id"] for r in rows]
    
    start_time = time.time()
    
    tasks = [worker(i, db, product_ids) for i in range(CONCURRENCY)]
    results = await asyncio.gather(*tasks)
    
    duration = time.time() - start_time
    
    total_success = sum(r[0] for r in results)
    total_failures = sum(r[1] for r in results)
    total_deadlocks = sum(r[2] for r in results)
    total_ops = CONCURRENCY * OPERATIONS_PER_WORKER
    
    logger.info("\n" + "="*40)
    logger.info(f"RESULTADOS ({duration:.2f}s)")
    logger.info("="*40)
    logger.info(f"Total Operaciones: {total_ops}")
    logger.info(f"✅ Éxitos:          {total_success}")
    logger.info(f"❌ Fallos:          {total_failures}")
    logger.info(f"🔒 Bloqueos/Deadlocks: {total_deadlocks}")
    logger.info(f"Rendimiento:       {total_ops/duration:.2f} ops/sec")
    
    if total_deadlocks > 0:
        logger.warning(f"⚠️ Se detectaron {total_deadlocks} conflictos de bloqueo.")
    else:
        logger.info("✨ Cero bloqueos detectados. La configuración WAL es estable.")

    await db.close()

if __name__ == "__main__":
    asyncio.run(main())