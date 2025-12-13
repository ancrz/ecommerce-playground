#!/usr/bin/env python3
"""
scripts/seed_dummies.py - Poblar base de datos SQLite con datos de prueba (Dummies)
===================================================================================

Este script asume arquitectura NO-ORM (SQL directo vía DatabaseManager):
1. Limpia ./data/database (RESET TOTAL)
2. Inicializa DatabaseManager (crea tablas automáticamente)
3. Inserta datos dummies usando sentencias SQL directas.
"""

import sys
import os
import shutil
import asyncio
import logging
from pathlib import Path
from decimal import Decimal
import uuid
from datetime import datetime
import json

# Config add root
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.append(str(PROJECT_ROOT))

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

import hashlib
import secrets

try:
    from backend.database.manager import DatabaseManager
    # from passlib.context import CryptContext <-- Passlib eliminado
except ImportError as e:
    logger.error(f"Error importando módulos del backend: {e}")
    sys.exit(1)

# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") <-- Eliminado

def get_hash(password: str) -> str:
    """
    Implementación duplicada de UserService._hash_password (PBKDF2-SHA256).
    Asegura que los usuarios creados en el seed se puedan loguear en el backend.
    """
    salt = secrets.token_bytes(16)
    hashed_bytes = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        100000 # Iteraciones
    )
    return f"{salt.hex()}${hashed_bytes.hex()}"

async def insert(db, chunk, table, data):
    """Helper para insertar diccionarios en SQL"""
    columns = list(data.keys())
    # DatabaseManager adapta '?' a '$n' si es postgres, pero aquí asumimos SQLite por el script.
    # El manager ya maneja placeholders.
    placeholders = ["?"] * len(columns)
    
    col_str = ", ".join(columns)
    val_str = ", ".join(placeholders)
    
    sql = f"INSERT INTO {table} ({col_str}) VALUES ({val_str})"
    await db.execute(chunk, sql, tuple(data.values()))

async def main():
    logger.info("⚠️  INICIANDO SEED DUMMIES (SQLite Reset) ⚠️")
    
    # 1. Init Manager (crea tablas si no existen)
    db_path = PROJECT_ROOT / "data" / "database"
    db_path.mkdir(parents=True, exist_ok=True)
    
    db = DatabaseManager(base_path=str(db_path))
    await db.initialize()
    
    # 2. Limpieza SQL (OneDrive Friendly)
    logger.info("🧹 Limpiando tablas existentes...")
    tables = [
        ("products", "products"), 
        ("cart", "cart_items"), ("cart", "carts"),
        ("sales", "sales"), ("sales", "daily_closures"),
        ("finance", "currencies"),
        ("users", "users"),
        ("tax", "tax_rates"), ("tax", "regions"),
        ("password_tokens", "password_reset_tokens")
        # No borramos business/customization para conservar IDs 1 (se hará update)
    ]
    
    for chunk, table in tables:
        try:
            await db.execute(chunk, f"DELETE FROM {table}") # DELETE para limpiar datos
        except Exception as e:
            logger.warning(f"No se pudo limpiar tabla {table}: {e}")

    logger.info("✅ Tablas limpias.")

    try:
        now_str = datetime.now().isoformat()
        
        # 3. Usuarios
        logger.info("busts_in_silhouette Creando usuarios...")
        users = [
            {
                "id": str(uuid.uuid4()),
                "username": "admin",
                "password_hash": get_hash("admin2024"),
                "full_name": "System Administrator",
                "email": "admin@example.com",
                "roles": json.dumps(["admin"]), # JSON as string for SQLite
                "is_active": True,
                "created_at": now_str,
                "updated_at": now_str
            },
            {
                "id": str(uuid.uuid4()),
                "username": "client",
                "password_hash": get_hash("client123"),
                "full_name": "Test Client",
                "email": "client@example.com",
                "roles": json.dumps(["client"]),
                "is_active": True,
                "created_at": now_str,
                "updated_at": now_str
            }
        ]
        for u in users:
            await insert(db, "users", "users", u)

        # 4. Monedas
        logger.info("💰 Creando monedas...")
        usd_id = str(uuid.uuid4())
        eur_id = str(uuid.uuid4())
        
        currencies = [
            {
                "id": usd_id,
                "name": "United States Dollar",
                "symbol": "$",
                "is_base": True,
                "exchange_rate": 1.0,
                "is_active": True,
                "created_at": now_str,
                "updated_at": now_str
            },
            {
                "id": eur_id,
                "name": "Euro",
                "symbol": "€",
                "is_base": False,
                "exchange_rate": 0.92,
                "is_active": True,
                "created_at": now_str,
                "updated_at": now_str
            }
        ]
        for c in currencies:
            await insert(db, "finance", "currencies", c)

        # 5. Regiones e Impuestos
        logger.info("🌍 Creando regiones...")
        reg_default_id = str(uuid.uuid4())
        reg_eu_id = str(uuid.uuid4())
        
        regions = [
            {
                "id": reg_default_id,
                "name": "Default Zone (No Tax)",
                "country": "International",
                "is_active": True,
                "created_at": now_str,
                "updated_at": now_str
            },
            {
                "id": reg_eu_id,
                "name": "EU Zone (VAT)",
                "country": "Europe",
                "is_active": True,
                "created_at": now_str,
                "updated_at": now_str
            }
        ]
        for r in regions:
            await insert(db, "tax", "regions", r)
            
        # Tax Rates
        await insert(db, "tax", "tax_rates", {
            "id": str(uuid.uuid4()),
            "name": "VAT Standard",
            "region_id": reg_eu_id,
            "rate": 0.20,
            "priority": 1,
            "is_active": True,
            "created_at": now_str,
            "updated_at": now_str
        })
        
        # 6. Business Info (Sobrescribir ID 1)
        # Nota: manager.py ya hace un INSERT OR IGNORE al inicio para business con ID 1.
        # Haremos un UPDATE.
        logger.info("🏢 Configurando negocio (E-Commerce Core)...")
        # El schema de business usa JSONB para social_networks, lo serializamos.
        socials = [
            {"name": "Instagram", "url": "https://instagram.com/ecommerce_core", "icon": "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg"},
            {"name": "Twitter", "url": "https://twitter.com/ecommerce_core", "icon": "https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg"}
        ]
        
        await db.execute("business", """
            UPDATE business_info SET 
                name = ?, 
                rif = ?, 
                contact = ?, 
                social_networks = ?,
                logo_url = ?,
                updated_at = ?
            WHERE id = 1
        """, ("E-Commerce Core", "J-00000000-0", "+1 555-0123", json.dumps(socials), "/logo.png", now_str))

        # 7. Productos
        logger.info("📦 Insertando productos...")
        products = [
            {
                "name": "Wireless Noise-Canceling Headphones",
                "price": 299.99,
                "category": "Electronics",
                "tags": "main",
                "img": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60",
                "desc": "Premium sound quality with active noise cancellation."
            },
            {
                "name": "Ergonomic Office Chair",
                "price": 149.50,
                "category": "Furniture",
                "tags": "featured",
                "img": "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=500&auto=format&fit=crop&q=60",
                 "desc": "Comfortable chair for long working hours."
            },
            {
                "name": "Smart Watch Series 5",
                "price": 199.99,
                "category": "Electronics",
                "tags": "discount",
                "discount_pct": 15.0,
                "img": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
                "desc": "Track your fitness metrics with precision."
            },
            {
                "name": "Mechanical Gaming Keyboard",
                "price": 89.00,
                "category": "Electronics",
                "tags": "main",
                "img": "https://images.unsplash.com/photo-1587829741301-dc798b91add1?w=500&auto=format&fit=crop&q=60",
                "desc": "Tactile switches for the ultimate gaming experience."
            },
            {
                "name": "Minimalist Desk Lamp",
                "price": 45.00,
                "category": "Home",
                "tags": "featured",
                "img": "https://images.unsplash.com/photo-1507473883581-c04586154589?w=500&auto=format&fit=crop&q=60",
                "desc": "Modern lighting for your workspace."
            },
            {
                "name": "Portable SSD 1TB",
                "price": 120.00,
                "category": "Storage",
                "tags": "discount",
                "discount_pct": 10.0,
                "img": "https://images.unsplash.com/photo-1597872252721-24654ba9ac9e?w=500&auto=format&fit=crop&q=60",
                "desc": "Fast and reliable storage on the go."
            }
        ]
        
        for p in products:
            p_data = {
                "id": str(uuid.uuid4()),
                "name": p["name"],
                "description": p["desc"],
                "sku": f"SKU-{str(uuid.uuid4())[:8].upper()}",
                "price": p["price"],
                "stock": 100,
                "category": p["category"],
                "image_url": p["img"],
                "banner_assignment": p["tags"],
                "is_featured": (p["tags"] == "featured"),
                "is_discount": (p.get("discount_pct") is not None),
                "discount_percentage": p.get("discount_pct", 0.0),
                "created_at": now_str,
                "updated_at": now_str
            }
            await insert(db, "products", "products", p_data)

        logger.info("✨ SEED COMPLETADO EXITOSAMENTE ✨")

    except Exception as e:
        logger.error(f"❌ Error en seed: {e}", exc_info=True)
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(main())
