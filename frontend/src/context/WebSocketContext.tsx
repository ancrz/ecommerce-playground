import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { config } from '../config';

// Exportar tipos para consumo externo
export interface StockUpdateEvent {
  type: 'stock_update';
  product_id: string;
  stock: number;
  product_name?: string;
  timestamp?: string; // Add timestamp to match previous interface
}

export interface OutOfStockEvent {
  type: 'out_of_stock';
  product_id: string;
  product_name: string;
  timestamp?: string;
}

export interface ProductUpdateEvent {
  type: 'product_update';
  product_id: string;
  updates: Record<string, unknown>;
  timestamp?: string;
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'; // Exported now

interface WebSocketContextType {
  status: WebSocketStatus;
  subscribeToProduct: (productId: string) => void;
  unsubscribeFromProduct: (productId: string) => void;
  lastEvent: unknown;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

// Función helper para determinar URL
const getWsUrl = () => {
  // DEBUG hardcoded para estabilidad local
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'ws://localhost:8042/api/ws/events';
  }
  const baseUrl = config.backendUrl; 
  const wsProtocol = baseUrl.startsWith('https') ? 'wss:' : 'ws:';
  const host = baseUrl.replace(/^https?:\/\//, '');
  return `${wsProtocol}//${host}/api/ws/events`;
};

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<unknown>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | undefined>(undefined); // Fix useRef default value
  const queryClient = useQueryClient();

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const url = getWsUrl();
    console.log('[WS Provider] Connecting to:', url);
    
    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('[WS Provider] Connected');
      setStatus('connected');
    };

    socket.onclose = () => {
      console.log('[WS Provider] Disconnected');
      setStatus('disconnected');
      ws.current = null;
      // Reconnect logic
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = window.setTimeout(() => connect(), 3000);
    };

    socket.onerror = (err) => {
      console.error('[WS Provider] Error:', err);
      setStatus('error');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);

        // Lógica Global de Invalidación
        if (data.type === 'stock_update' || data.type === 'out_of_stock') {
          queryClient.invalidateQueries({ queryKey: ['product', data.product_id] });
          queryClient.invalidateQueries({ queryKey: ['products'] }); // Refrescar listas también
          console.log('[WS] Cache invalidated for:', data.product_id);
        }
      } catch (e) {
        console.error('[WS] Parse error', e);
      }
    };

    ws.current = socket;
  };

  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
      clearTimeout(reconnectTimeout.current);
    };
  }, []);

  const subscribeToProduct = (productId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'subscribe', product_id: productId }));
    }
  };

  const unsubscribeFromProduct = (productId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'unsubscribe', product_id: productId }));
    }
  };

  return (
    <WebSocketContext.Provider value={{ status, subscribeToProduct, unsubscribeFromProduct, lastEvent }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within WebSocketProvider');
  return context;
};
