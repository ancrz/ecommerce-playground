#!/usr/bin/env python3
"""
scripts/test_websocket.py
Script para probar la conectividad WebSocket y recepción de eventos.
Requiere que el servidor esté corriendo en background.
"""

import asyncio
import json
import logging
import os
import sys

# Configurar logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

try:
    import websockets
except ImportError:
    logger.error("La librería 'websockets' no está instalada. Ejecuta: pip install websockets")
    sys.exit(1)

PORT = os.getenv("BACKEND_PORT", "8042")
WS_URL = f"ws://localhost:{PORT}/api/ws/events"


async def test_connection():
    logger.info(f"Conectando a {WS_URL}...")

    try:
        async with websockets.connect(WS_URL) as websocket:
            # 1. Esperar mensaje de bienvenida
            welcome_msg = await websocket.recv()
            data = json.loads(welcome_msg)
            logger.info(f"✓ Conectado exitosamente. ID: {data.get('connection_id')}")

            # 2. Enviar Ping
            logger.info("Enviando Ping...")
            await websocket.send(json.dumps({"action": "ping"}))
            pong_msg = await websocket.recv()
            logger.info(f"Recibido: {pong_msg}")

            if json.loads(pong_msg).get("type") == "pong":
                logger.info("✓ Ping/Pong correcto.")

            # 3. Suscribirse a un producto dummy
            dummy_id = "test-product-123"
            logger.info(f"Suscribiéndose a producto {dummy_id}...")
            await websocket.send(json.dumps({"action": "subscribe", "product_id": dummy_id}))

            sub_msg = await websocket.recv()
            logger.info(f"Recibido: {sub_msg}")

            # 4. Mantener conexión brevemente
            logger.info("Esperando eventos (5 segundos)... (Ejecuta una venta en otra terminal para ver eventos)")
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f"Evento recibido: {msg}")
            except TimeoutError:
                logger.info("No se recibieron eventos externos en 5s.")

            logger.info("Cerrando conexión...")

    except ConnectionRefusedError:
        logger.error("❌ No se pudo conectar. Asegúrate de que el servidor Backend esté corriendo (puerto 8042).")
    except Exception as e:
        logger.error(f"❌ Error durante la prueba: {e}")


if __name__ == "__main__":
    asyncio.run(test_connection())
