import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { TouchButton } from '../../components/common/TouchButton';
// import { Input } from '../../components/FormControls'; // Removed: Edit form is in FiscalDataTab

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  isLoading: boolean;
  onRefresh: () => void; // Trigger refresh from parent
}

export function InvoicePreviewModal({ isOpen, onClose, pdfBlob, isLoading, onRefresh }: InvoicePreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [pdfBlob]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Vista Previa de Factura
              </h3>
              <button 
                onClick={onClose}
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <span className="sr-only">Cerrar</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 h-[600px] bg-gray-100 flex items-center justify-center border rounded-md">
              {isLoading ? (
                <div className="text-gray-500 flex flex-col items-center">
                   <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                   Generando PDF...
                </div>
              ) : pdfUrl ? (
                <iframe 
                  src={pdfUrl} 
                  className="w-full h-full rounded-md" 
                  title="PDF Preview"
                />
              ) : (
                <span className="text-gray-400">No hay vista previa disponible</span>
              )}
            </div>
            
            <p className="mt-2 text-sm text-gray-500">
               Esta es una factura de prueba generada con los datos actuales del formulario. No se ha guardado nada en la base de datos.
            </p>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
             <TouchButton 
               onClick={onClose} 
               variant="secondary"
               className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto"
             >
               Cerrar
             </TouchButton>
             
             <TouchButton
               onClick={onRefresh}
               variant="primary"
               className="w-full sm:w-auto"
                               loading={isLoading}
                               icon={RefreshCw}
                             >
                               Actualizar Vista Previa
                             </TouchButton>          </div>
        </div>
      </div>
    </div>
  );
}
