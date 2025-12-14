/**
 * src/components/Modal.tsx
 * Componente genérico y accesible para ventanas modales.
 * (Extraído de AdminPanel para reutilización).
 */
import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Modal: React.FC<ModalProps> = ({
  title,
  isOpen,
  onClose,
  children,
  size = "lg",
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    // Overlay
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      data-testid="modal-overlay"
    >
      {/* Contenido */}
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col transform transition-all scale-100 ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-content"
      >
        {/* Encabezado */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 id="modal-title" className="text-xl font-bold text-gray-800">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
            aria-label="Cerrar modal"
            data-testid="modal-close-button"
          >
            <X size={24} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
