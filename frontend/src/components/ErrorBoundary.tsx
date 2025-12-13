/**
 * src/components/ErrorBoundary.tsx
 * * Componente genérico para capturar errores de renderizado de JavaScript,
 * incluyendo fallos en la carga de 'React.lazy()' chunks.
 * (Implementa la Corrección Crítica #1 de la auditoría M45).
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Actualiza el estado para que el siguiente render muestre la UI de fallback.
    return { hasError: true, error: error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Aquí podrías enviar el error a un servicio de logging (ej. Sentry)
    console.error("Error capturado por ErrorBoundary:", error, errorInfo);
  }

  private handleRetry = () => {
    // Intenta recargar la página para resolver un posible error de chunk
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // UI de Fallback (para E2E tests)
      return (
        <div 
          className="p-8 bg-red-50 border border-red-300 rounded-lg max-w-2xl mx-auto my-12" 
          role="alert"
          data-testid="error-boundary-fallback"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-10 h-10 text-red-500" />
            <div>
              <h2 className="text-xl font-bold text-red-800">
                {this.props.fallbackMessage || "Error al cargar el módulo"}
              </h2>
              <p className="text-red-700 mt-1">
                Ocurrió un error inesperado. Esto puede deberse a un problema de red al cargar un componente.
              </p>
            </div>
          </div>
          <button
            onClick={this.handleRetry}
            data-testid="error-boundary-retry-button"
            className="mt-6 bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Reintentar (Recargar página)
          </button>
          <pre className="mt-4 p-2 bg-gray-100 text-red-900 text-xs overflow-auto rounded">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;