/**
 * src/hooks/useStockUpdates.ts
 * Hook para actualizaciones de stock en tiempo real via WebSocket.
 * 
 * Características:
 * - Conexión automática y reconexión
 * - Heartbeat para mantener conexión viva
 * - Integración con React Query para invalidación de cache
 * - Event emitter para componentes
 */

import { useEffect, useState } from 'react';
import { useWebSocket, WebSocketStatus, StockUpdateEvent, OutOfStockEvent, ProductUpdateEvent } from '../context/WebSocketContext';

// Re-export type for compatibility
export type ConnectionStatus = WebSocketStatus;

interface UseStockUpdatesOptions {
  onStockUpdate?: (event: StockUpdateEvent) => void;
  onOutOfStock?: (event: OutOfStockEvent) => void;
  onProductUpdate?: (event: ProductUpdateEvent) => void;
  autoConnect?: boolean; // Deprecated but kept for compatibility
  invalidateQueries?: boolean; // Deprecated, handled by context
}

export function useStockUpdates(options: UseStockUpdatesOptions = {}) {
  const { status, subscribeToProduct, unsubscribeFromProduct, lastEvent } = useWebSocket();
  const { onStockUpdate, onOutOfStock, onProductUpdate } = options;

  // Process events from context
  useEffect(() => {
    if (!lastEvent) return;
    
    // @ts-expect-error - Event type checking logic
    const evt = lastEvent as any; 

    if (evt.type === 'stock_update' && onStockUpdate) {
      onStockUpdate(evt);
    }
    if (evt.type === 'out_of_stock' && onOutOfStock) {
      onOutOfStock(evt);
    }
    if (evt.type === 'product_update' && onProductUpdate) {
      onProductUpdate(evt);
    }
  }, [lastEvent, onStockUpdate, onOutOfStock, onProductUpdate]);

  return {
    status,
    // Provide compatibility API
    connectionId: 'global',
    lastEvent,
    connect: () => {}, // No-op, managed globally
    disconnect: () => {}, // No-op
    subscribeToProduct,
    unsubscribeFromProduct,
    isConnected: status === 'connected',
  };
}

export default useStockUpdates;
