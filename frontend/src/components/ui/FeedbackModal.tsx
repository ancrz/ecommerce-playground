/**
 * FeedbackModal & Toast Components
 * Sistema unificado de feedback visual para la aplicación.
 * 
 * Incluye:
 * - Toast: Notificaciones temporales (success/error/info)
 * - ConfirmModal: Diálogo de confirmación con acción destructiva
 * - AlertModal: Diálogo de información
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface FeedbackContextType {
  showToast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const FeedbackContext = createContext<FeedbackContextType | null>(null);

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

// ============================================================================
// TOAST COMPONENT
// ============================================================================

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />,
  };

  const colors = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-600 text-white',
  };

  return (
    <div
      className={`${colors[toast.type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slideUp min-w-[280px]`}
    >
      {icons[toast.type]}
      <span className="flex-1 font-medium">{toast.message}</span>
      <button onClick={onClose} className="p-1 hover:opacity-70 transition">
        <X size={16} />
      </button>
    </div>
  );
}

// ============================================================================
// CONFIRM MODAL COMPONENT
// ============================================================================

interface ConfirmModalProps {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ options, onConfirm, onCancel }: ConfirmModalProps) {
  const { title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'danger' } = options;

  const headerColors = {
    danger: 'bg-red-600',
    warning: 'bg-yellow-500',
    info: 'bg-blue-600',
  };

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-500 hover:bg-yellow-600',
    info: 'bg-blue-600 hover:bg-blue-700',
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-slideUp overflow-hidden">
        {/* Header con color del tema */}
        <div className={`${headerColors[type]} px-6 py-4 text-white`}>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle size={20} />
            {title}
          </h3>
        </div>
        
        {/* Contenido */}
        <div className="px-6 py-4">
          <p className="text-gray-700">{message}</p>
        </div>
        
        {/* Botones */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${buttonColors[type]} text-white rounded-lg transition font-medium`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROVIDER
// ============================================================================

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove después de 3 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    confirmState?.resolve(true);
    setConfirmState(null);
  };

  const handleCancel = () => {
    confirmState?.resolve(false);
    setConfirmState(null);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <FeedbackContext.Provider value={{ showToast, confirm }}>
      {children}
      
      {/* Container de Toasts - Centrado */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] flex flex-col gap-2 items-center">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
      
      {/* Modal de Confirmación */}
      {confirmState && (
        <ConfirmModal
          options={confirmState.options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </FeedbackContext.Provider>
  );
}
