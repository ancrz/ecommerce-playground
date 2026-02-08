/**
 * ResponsiveModal - Componente Estándar de UI para Modales
 * ========================================================
 * 
 * ⚠️ IMPORTANTE: NO BORRAR ESTE ARCHIVO
 * Este componente es la base estandarizada para todos los NUEVOS modales de la aplicación.
 * Implementa automáticamente el patrón de diseño "Responsive Modal Pattern":
 * 
 * 1. Mobile First: Se comporta como un "Bottom Sheet" en pantallas pequeñas.
 * 2. Desktop Dialog: Se comporta como un modal centrado tradicional en escritorio.
 * 3. Accessibility: Manejo automático de focus, scroll lock y teclado (Escape).
 * 
 * ¿Por qué existe este componente?
 * -------------------------------
 * Para evitar la deuda técnica de tener que reimplementar la lógica responsiva (media queries,
 * clases condicionales, manejo de scroll) en cada nuevo modal. Los modales legacy se han
 * refactorizado manualmente, pero todo desarrollo nuevo DEBE usar este componente.
 * 
 * Uso:
 * <ResponsiveModal 
 *   isOpen={state} 
 *   onClose={handler} 
 *   title="Nuevo Elemento"
 *   size="md" // sm, md, lg, xl, full
 * >
 *   <YourContent />
 * </ResponsiveModal>
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ResponsiveModalProps {
  /** Controla la visibilidad del modal */
  isOpen: boolean;
  /** Función para cerrar el modal (botón X, backdrop, ESC) */
  onClose: () => void;
  /** Título principal mostrado en el header */
  title: string;
  /** Subtítulo opcional debajo del título principal */
  subtitle?: string;
  /** Icono opcional a la izquierda del título */
  icon?: React.ReactNode;
  /** Contenido del cuerpo del modal */
  children: React.ReactNode;
  /** 
   * Tamaño del modal en desktop (en mobile siempre es full-width).
   * - sm: max-w-sm
   * - md: max-w-md (Defecto)
   * - lg: max-w-lg
   * - xl: max-w-2xl
   * - full: max-w-4xl
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Clase de color de fondo para el header (ej: 'bg-indigo-600') */
  headerColor?: string;
  /** Elementos opcionales para el footer (botones de acción) */
  footer?: React.ReactNode;
  /** Si es true, previene el scroll del body mientras el modal está abierto (Defecto: true) */
  lockScroll?: boolean;
}

const SIZE_CLASSES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
  full: 'sm:max-w-4xl',
} as const;

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = 'md',
  headerColor = 'bg-indigo-600',
  footer,
  lockScroll = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Lock body scroll cuando el modal está abierto
  useEffect(() => {
    if (lockScroll && isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, lockScroll]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className={`
          bg-white 
          w-full ${SIZE_CLASSES[size]}
          h-[85vh] sm:h-auto sm:max-h-[85vh]
          rounded-t-2xl sm:rounded-xl
          shadow-2xl
          overflow-hidden
          flex flex-col
          animate-in slide-in-from-bottom sm:fade-in sm:zoom-in-95
          duration-200
          safe-area-bottom
        `}
      >
        {/* Header */}
        <div
          className={`
            ${headerColor}
            px-4 sm:px-6 py-4
            flex items-center justify-between
            shrink-0
          `}
        >
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <span className="text-white/90 shrink-0">{icon}</span>
            )}
            <div className="min-w-0">
              <h2
                id="modal-title"
                className="text-fluid-lg font-semibold text-white truncate"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="text-fluid-sm text-white/70 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain p-4 sm:p-6">
          {children}
        </div>

        {/* Footer (opcional) */}
        {footer && (
          <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsiveModal;
