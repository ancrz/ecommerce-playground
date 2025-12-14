
/**
 * src/logger.ts
 * Captura logs del navegador y los envía al backend para observabilidad centralizada.
 */

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

// URL relativa (el proxy de Vite redirige a backend)
const LOG_ENDPOINT = '/api/client-logs/';

type LogLevel = 'info' | 'warn' | 'error';

const sendLog = (level: LogLevel, args: any[], stack?: string) => {
  try {
    // Serializar argumentos
    const message = args.map(arg => {
      try {
        if (arg instanceof Error) return `${arg.message}\n${arg.stack}`;
        return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
      } catch {
        return String(arg);
      }
    }).join(' ');

    // Filtrar mensajes ruidosos de Vite/HMR
    if (message.includes('[vite]') || message.includes('Hot update')) return;

    const payload = {
      level,
      message,
      url: window.location.hash || window.location.pathname, // Hash router support if needed
      timestamp: new Date().toISOString(),
      stack: stack || undefined
    };

    // Usar sendBeacon para mayor fiabilidad al cerrar ventana
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const success = navigator.sendBeacon(LOG_ENDPOINT, blob);

    if (!success) {
      // Fallback a fetch si el payload es muy grande o sendBeacon falla
      // keepalive: true permite que sobreviva a la navegación
      fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    }

  } catch (err) {
    // Silencioso para evitar loop
  }
};

export const initLogger = () => {
  if ((window as any).__loggerInitialized) return;
  (window as any).__loggerInitialized = true;

  console.log = (...args) => {
    originalLog.apply(console, args);
    sendLog('info', args);
  };

  console.warn = (...args) => {
    originalWarn.apply(console, args);
    sendLog('warn', args);
  };

  console.error = (...args) => {
    originalError.apply(console, args);
    // Capturar stack trace manual
    const err = new Error();
    // Eliminar las primeras líneas que corresponden a esta función
    const stack = err.stack?.split('\n').slice(2).join('\n'); 
    sendLog('error', args, stack);
  };

  // Capturar errores globales
  window.addEventListener('error', (event) => {
    sendLog('error', [`[Uncaught] ${event.message}`], event.error?.stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    sendLog('error', [`[Unhandled Rejection] ${event.reason}`]);
  });
  
  originalLog("[Observability] Remote Client Logging Enabled -> /api/client-logs/");
};
