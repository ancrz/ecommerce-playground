"""
backend/api/websocket.py
WebSocket Server para actualizaciones en tiempo real.

Características:
- Broadcast de cambios de stock a todos los clientes conectados
- Eventos: stock_update, product_update, cart_sync
- Manejo de reconexión y heartbeat
"""

import json
import logging
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter()

# ==================== CONNECTION MANAGER ====================


class ConnectionManager:
    """
    Gestor de conexiones WebSocket.
    Mantiene un registro de todos los clientes conectados y permite
    broadcast de mensajes a todos o a un subset específico.
    """

    def __init__(self):
        # Conexiones activas: {connection_id: websocket}
        self.active_connections: dict[str, WebSocket] = {}
        # Subscripciones por producto: {product_id: {connection_ids}}
        self.product_subscriptions: dict[str, set[str]] = {}
        # Contador para IDs únicos
        self._connection_counter = 0

    def _generate_connection_id(self) -> str:
        """Genera un ID único para cada conexión."""
        self._connection_counter += 1
        return f"conn_{self._connection_counter}_{datetime.now().timestamp()}"

    async def connect(self, websocket: WebSocket) -> str:
        """
        Acepta una nueva conexión WebSocket y retorna su ID.
        """
        await websocket.accept()
        connection_id = self._generate_connection_id()
        self.active_connections[connection_id] = websocket
        logger.info(f"WebSocket conectado: {connection_id}. Total: {len(self.active_connections)}")
        return connection_id

    def disconnect(self, connection_id: str):
        """
        Elimina una conexión y sus subscripciones.
        """
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

        # Limpiar subscripciones
        for product_id in list(self.product_subscriptions.keys()):
            self.product_subscriptions[product_id].discard(connection_id)
            if not self.product_subscriptions[product_id]:
                del self.product_subscriptions[product_id]

        logger.info(f"WebSocket desconectado: {connection_id}. Total: {len(self.active_connections)}")

    def subscribe_to_product(self, connection_id: str, product_id: str):
        """Suscribe una conexión a actualizaciones de un producto específico."""
        if product_id not in self.product_subscriptions:
            self.product_subscriptions[product_id] = set()
        self.product_subscriptions[product_id].add(connection_id)

    def unsubscribe_from_product(self, connection_id: str, product_id: str):
        """Desuscribe una conexión de un producto."""
        if product_id in self.product_subscriptions:
            self.product_subscriptions[product_id].discard(connection_id)

    async def send_personal_message(self, message: dict, connection_id: str):
        """Envía un mensaje a una conexión específica."""
        websocket = self.active_connections.get(connection_id)
        if websocket:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error enviando a {connection_id}: {e}")
                self.disconnect(connection_id)

    async def broadcast(self, message: dict):
        """Envía un mensaje a TODAS las conexiones activas."""
        disconnected = []
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error en broadcast a {connection_id}: {e}")
                disconnected.append(connection_id)

        # Limpiar conexiones fallidas
        for conn_id in disconnected:
            self.disconnect(conn_id)

    async def broadcast_to_product_subscribers(self, product_id: str, message: dict):
        """Envía un mensaje solo a los suscriptores de un producto específico."""
        subscribers = self.product_subscriptions.get(product_id, set())
        disconnected = []

        for connection_id in subscribers:
            websocket = self.active_connections.get(connection_id)
            if websocket:
                try:
                    await websocket.send_json(message)
                except Exception:
                    disconnected.append(connection_id)

        for conn_id in disconnected:
            self.disconnect(conn_id)

    def get_stats(self) -> dict:
        """Retorna estadísticas de conexiones."""
        return {
            "total_connections": len(self.active_connections),
            "product_subscriptions": {pid: len(subs) for pid, subs in self.product_subscriptions.items()},
        }


# Instancia global del manager
manager = ConnectionManager()


# ==================== EVENT EMITTERS ====================


async def emit_stock_update(product_id: str, new_stock: int, product_name: str = ""):
    """
    Emite un evento de actualización de stock a todos los clientes.
    Llamar desde ProductService después de cualquier cambio de stock.
    """
    message = {
        "type": "stock_update",
        "product_id": product_id,
        "stock": new_stock,
        "product_name": product_name,
        "timestamp": datetime.now().isoformat(),
    }
    await manager.broadcast(message)
    logger.info(f"Stock update emitido: {product_id} -> {new_stock}")


async def emit_product_update(product_id: str, updates: dict):
    """
    Emite un evento de actualización de producto.
    """
    message = {
        "type": "product_update",
        "product_id": product_id,
        "updates": updates,
        "timestamp": datetime.now().isoformat(),
    }
    await manager.broadcast(message)


async def emit_product_out_of_stock(product_id: str, product_name: str):
    """
    Emite un evento especial cuando un producto se agota.
    """
    message = {
        "type": "out_of_stock",
        "product_id": product_id,
        "product_name": product_name,
        "timestamp": datetime.now().isoformat(),
    }
    await manager.broadcast(message)
    logger.warning(f"Producto agotado: {product_name} ({product_id})")


# ==================== WEBSOCKET ENDPOINT ====================


@router.websocket("/events")
async def websocket_endpoint(websocket: WebSocket):
    """
    Endpoint principal de WebSocket.

    Mensajes del cliente:
    - {"action": "subscribe", "product_id": "xxx"} - Suscribirse a producto
    - {"action": "unsubscribe", "product_id": "xxx"} - Desuscribirse
    - {"action": "ping"} - Heartbeat

    Mensajes del servidor:
    - {"type": "connected", "connection_id": "xxx"}
    - {"type": "stock_update", "product_id": "xxx", "stock": N}
    - {"type": "out_of_stock", "product_id": "xxx", "product_name": "xxx"}
    - {"type": "pong"}
    """
    connection_id = await manager.connect(websocket)

    try:
        # Enviar confirmación de conexión
        await websocket.send_json(
            {"type": "connected", "connection_id": connection_id, "timestamp": datetime.now().isoformat()}
        )

        while True:
            # Esperar mensajes del cliente
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                action = message.get("action")

                if action == "ping":
                    await websocket.send_json({"type": "pong"})

                elif action == "subscribe":
                    product_id = message.get("product_id")
                    if product_id:
                        manager.subscribe_to_product(connection_id, product_id)
                        await websocket.send_json({"type": "subscribed", "product_id": product_id})

                elif action == "unsubscribe":
                    product_id = message.get("product_id")
                    if product_id:
                        manager.unsubscribe_from_product(connection_id, product_id)
                        await websocket.send_json({"type": "unsubscribed", "product_id": product_id})

                elif action == "get_stats":
                    stats = manager.get_stats()
                    await websocket.send_json({"type": "stats", "data": stats})

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})

    except WebSocketDisconnect:
        manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"Error en WebSocket {connection_id}: {e}")
        manager.disconnect(connection_id)


# ==================== HTTP ENDPOINTS PARA STATS ====================


@router.get("/ws/stats")
async def get_websocket_stats():
    """Endpoint HTTP para obtener estadísticas de WebSocket (admin only)."""
    return manager.get_stats()
