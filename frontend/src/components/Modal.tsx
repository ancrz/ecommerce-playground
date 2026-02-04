/**
 * src/components/Modal.tsx
 * Componente genérico y accesible para ventanas modales.
 * REFACTORIZADO: Footer Slot + Scroll Lock + Z-Index fix.
 */
import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Z_INDEX } from "../constants";

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode; // Nuevo slot para footer fijo
  size?: "sm" | "md" | "lg" | "xl" | "full"; // Added full for mobile
}

export const Modal: React.FC<ModalProps> = ({
  title,
  isOpen,
  onClose,
  children,
  footer,
  size = "lg",
}) => {
  // Lock Body Scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "w-full h-full md:h-auto md:max-w-2xl", // Mobile full screen
  };

  return (
    // Overlay
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200"
      style={{ zIndex: Z_INDEX.MODAL }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      data-testid="modal-overlay"
    >
      {/* Contenido */}
      <div
        className={`bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-h-[95dvh] md:max-h-[90vh] flex flex-col transform transition-all scale-100 ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-content"
      >
        {/* Encabezado Sticky */}
        <div className="flex justify-between items-center p-4 border-b shrink-0">
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

        {/* Cuerpo Scrolleable */}
        <div className="p-6 overflow-y-auto flex-1 overscroll-contain">
            {children}
        </div>

        {/* Footer Fijo (Opcional) */}
        {footer && (
            <div className="p-4 border-t bg-gray-50 shrink-0 sticky bottom-0 z-10 rounded-b-2xl">
                {footer}
            </div>
        )}
      </div>
    </div>
  );
};
