"""
backend/services/webhook_service.py
Servicio de Webhooks para notificaciones externas.

Características:
- Registro de webhooks por tipo de evento
- Envío asíncrono con reintentos
- Firma HMAC para seguridad
- Logging de entregas
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
import asyncio

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    logging.warning("httpx not installed. Webhooks will be disabled.")

logger = logging.getLogger(__name__)


# ==================== DATA MODELS ====================

@dataclass
class WebhookConfig:
    """Configuración de un webhook registrado."""
    id: str
    url: str
    secret: str
    events: List[str]  # Tipos de eventos a los que está suscrito
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.now)
    last_delivery: Optional[datetime] = None
    delivery_count: int = 0
    failure_count: int = 0


@dataclass
class WebhookDelivery:
    """Registro de un intento de entrega de webhook."""
    webhook_id: str
    event_type: str
    payload: dict
    status_code: Optional[int] = None
    success: bool = False
    error_message: Optional[str] = None
    delivered_at: datetime = field(default_factory=datetime.now)
    response_time_ms: Optional[float] = None


# ==================== WEBHOOK EVENTS ====================

class WebhookEvents:
    """Tipos de eventos soportados."""
    # Productos
    PRODUCT_CREATED = "product.created"
    PRODUCT_UPDATED = "product.updated"
    PRODUCT_DELETED = "product.deleted"
    PRODUCT_OUT_OF_STOCK = "product.out_of_stock"
    PRODUCT_RESTOCKED = "product.restocked"
    
    # Ventas
    SALE_COMPLETED = "sale.completed"
    SALE_CANCELLED = "sale.cancelled"
    
    # Carrito
    CART_ABANDONED = "cart.abandoned"
    
    # Sistema
    SYSTEM_STARTUP = "system.startup"
    SYSTEM_ERROR = "system.error"


# ==================== WEBHOOK SERVICE ====================

class WebhookService:
    """
    Servicio para gestión y envío de webhooks.
    
    Uso:
        webhook_service = WebhookService()
        
        # Registrar un webhook
        webhook_service.register(
            url="https://example.com/webhook",
            secret="my-secret",
            events=[WebhookEvents.PRODUCT_OUT_OF_STOCK, WebhookEvents.SALE_COMPLETED]
        )
        
        # Emitir un evento
        await webhook_service.emit(
            event_type=WebhookEvents.PRODUCT_OUT_OF_STOCK,
            payload={"product_id": "123", "product_name": "Producto X"}
        )
    """
    
    def __init__(self):
        # Almacenamiento en memoria (en producción usar DB)
        self.webhooks: Dict[str, WebhookConfig] = {}
        self.delivery_log: List[WebhookDelivery] = []
        self._webhook_counter = 0
    
    def _generate_id(self) -> str:
        """Genera un ID único para un webhook."""
        self._webhook_counter += 1
        return f"wh_{self._webhook_counter}"
    
    def _sign_payload(self, payload: str, secret: str) -> str:
        """
        Genera una firma HMAC-SHA256 del payload.
        El receptor puede verificar la autenticidad usando esta firma.
        """
        signature = hmac.new(
            key=secret.encode('utf-8'),
            msg=payload.encode('utf-8'),
            digestmod=hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"
    
    def register(
        self,
        url: str,
        secret: str,
        events: List[str],
        is_active: bool = True
    ) -> WebhookConfig:
        """Registra un nuevo webhook."""
        webhook_id = self._generate_id()
        webhook = WebhookConfig(
            id=webhook_id,
            url=url,
            secret=secret,
            events=events,
            is_active=is_active
        )
        self.webhooks[webhook_id] = webhook
        logger.info(f"Webhook registrado: {webhook_id} -> {url} (eventos: {events})")
        return webhook
    
    def unregister(self, webhook_id: str) -> bool:
        """Elimina un webhook registrado."""
        if webhook_id in self.webhooks:
            del self.webhooks[webhook_id]
            logger.info(f"Webhook eliminado: {webhook_id}")
            return True
        return False
    
    def get_webhooks_for_event(self, event_type: str) -> List[WebhookConfig]:
        """Obtiene todos los webhooks suscritos a un tipo de evento."""
        return [
            wh for wh in self.webhooks.values()
            if wh.is_active and event_type in wh.events
        ]
    
    async def emit(
        self,
        event_type: str,
        payload: Dict[str, Any],
        retry_count: int = 3,
        retry_delay: float = 1.0
    ) -> List[WebhookDelivery]:
        """
        Emite un evento a todos los webhooks suscritos.
        Retorna una lista de resultados de entrega.
        """
        if not HTTPX_AVAILABLE:
            logger.warning("httpx not available, skipping webhook emission")
            return []
        
        webhooks = self.get_webhooks_for_event(event_type)
        
        if not webhooks:
            logger.debug(f"No hay webhooks suscritos a {event_type}")
            return []
        
        # Preparar payload con metadatos
        full_payload = {
            "event": event_type,
            "timestamp": datetime.now().isoformat(),
            "data": payload
        }
        payload_json = json.dumps(full_payload, default=str)
        
        # Enviar a todos los webhooks en paralelo
        tasks = [
            self._deliver(webhook, event_type, payload_json, retry_count, retry_delay)
            for webhook in webhooks
        ]
        
        deliveries = await asyncio.gather(*tasks)
        return deliveries
    
    async def _deliver(
        self,
        webhook: WebhookConfig,
        event_type: str,
        payload_json: str,
        retry_count: int,
        retry_delay: float
    ) -> WebhookDelivery:
        """Entrega un webhook con reintentos."""
        delivery = WebhookDelivery(
            webhook_id=webhook.id,
            event_type=event_type,
            payload=json.loads(payload_json)
        )
        
        # Generar firma
        signature = self._sign_payload(payload_json, webhook.secret)
        
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Event": event_type,
            "X-Webhook-Signature": signature,
            "X-Webhook-Timestamp": datetime.now().isoformat(),
            "User-Agent": "Ecommerce-Playground-Webhook/1.0"
        }
        
        for attempt in range(retry_count):
            try:
                start_time = asyncio.get_event_loop().time()
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        webhook.url,
                        content=payload_json,
                        headers=headers
                    )
                
                end_time = asyncio.get_event_loop().time()
                delivery.response_time_ms = (end_time - start_time) * 1000
                delivery.status_code = response.status_code
                
                if 200 <= response.status_code < 300:
                    delivery.success = True
                    webhook.delivery_count += 1
                    webhook.last_delivery = datetime.now()
                    logger.info(f"Webhook entregado: {webhook.id} -> {webhook.url} ({response.status_code})")
                    break
                else:
                    delivery.error_message = f"HTTP {response.status_code}"
                    logger.warning(f"Webhook respuesta no exitosa: {webhook.id} -> {response.status_code}")
                    
            except Exception as e:
                delivery.error_message = str(e)
                logger.error(f"Webhook error (intento {attempt + 1}): {webhook.id} -> {e}")
            
            # Esperar antes del siguiente intento
            if attempt < retry_count - 1:
                await asyncio.sleep(retry_delay * (attempt + 1))
        
        if not delivery.success:
            webhook.failure_count += 1
        
        self.delivery_log.append(delivery)
        return delivery
    
    def get_delivery_log(self, limit: int = 100) -> List[WebhookDelivery]:
        """Obtiene el log de entregas recientes."""
        return self.delivery_log[-limit:]
    
    def get_stats(self) -> dict:
        """Obtiene estadísticas del servicio de webhooks."""
        total_deliveries = len(self.delivery_log)
        successful = sum(1 for d in self.delivery_log if d.success)
        
        return {
            "registered_webhooks": len(self.webhooks),
            "active_webhooks": sum(1 for wh in self.webhooks.values() if wh.is_active),
            "total_deliveries": total_deliveries,
            "successful_deliveries": successful,
            "failure_rate": (total_deliveries - successful) / total_deliveries if total_deliveries else 0,
            "webhooks": [
                {
                    "id": wh.id,
                    "url": wh.url[:50] + "..." if len(wh.url) > 50 else wh.url,
                    "events": wh.events,
                    "is_active": wh.is_active,
                    "delivery_count": wh.delivery_count,
                    "failure_count": wh.failure_count
                }
                for wh in self.webhooks.values()
            ]
        }


# ==================== INSTANCIA GLOBAL ====================

webhook_service = WebhookService()


# ==================== CONVENIENCE FUNCTIONS ====================

async def emit_product_event(event_type: str, product_id: str, product_name: str, **extra):
    """Helper para emitir eventos de productos."""
    await webhook_service.emit(
        event_type=event_type,
        payload={
            "product_id": product_id,
            "product_name": product_name,
            **extra
        }
    )


async def emit_sale_event(event_type: str, sale_id: str, total: float, **extra):
    """Helper para emitir eventos de ventas."""
    await webhook_service.emit(
        event_type=event_type,
        payload={
            "sale_id": sale_id,
            "total": total,
            **extra
        }
    )
