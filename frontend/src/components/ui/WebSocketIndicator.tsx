/**
 * src/components/ui/WebSocketIndicator.tsx
 * Indicador visual del estado de conexión WebSocket.
 * Muestra un pequeño badge con el estado de la conexión en tiempo real.
 */

import React from 'react';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';
import type { ConnectionStatus } from '../../hooks/useStockUpdates';

interface WebSocketIndicatorProps {
  status: ConnectionStatus;
  showLabel?: boolean;
  className?: string;
}

export default function WebSocketIndicator({ 
  status, 
  showLabel = false,
  className = '' 
}: WebSocketIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi size={14} />,
          color: 'bg-green-500',
          textColor: 'text-green-600',
          label: 'En vivo',
          pulse: true,
        };
      case 'connecting':
        return {
          icon: <Loader2 size={14} className="animate-spin" />,
          color: 'bg-yellow-500',
          textColor: 'text-yellow-600',
          label: 'Conectando...',
          pulse: false,
        };
      case 'disconnected':
        return {
          icon: <WifiOff size={14} />,
          color: 'bg-gray-400',
          textColor: 'text-gray-500',
          label: 'Desconectado',
          pulse: false,
        };
      case 'error':
        return {
          icon: <AlertTriangle size={14} />,
          color: 'bg-red-500',
          textColor: 'text-red-600',
          label: 'Error',
          pulse: false,
        };
      default:
        return {
          icon: <WifiOff size={14} />,
          color: 'bg-gray-400',
          textColor: 'text-gray-500',
          label: 'Desconocido',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div 
      className={`flex items-center gap-1.5 ${className}`}
      title={`Estado de conexión: ${config.label}`}
    >
      <div className="relative">
        <div 
          className={`w-5 h-5 rounded-full ${config.color} flex items-center justify-center text-white`}
        >
          {config.icon}
        </div>
        {config.pulse && (
          <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 ${config.color} rounded-full animate-ping`} />
        )}
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}
