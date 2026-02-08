/**
 * src/components/CheckoutModal.tsx
 * Modal de Checkout / Confirmación de Pedido (Design 8)
 * 
 * - Muestra el QR de pedido premium
 * - Instrucciones claras
 * - Gamificación de despedida
 */
import React from 'react';
import { QrCode, Download, Copy, CheckCircle, ShieldCheck, X } from 'lucide-react';
import { useFeedback } from './ui/FeedbackModal';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string;
  orderId: string;
  total: string;
}

export default function CheckoutModal({ isOpen, onClose, qrCode, orderId, total }: CheckoutModalProps) {
  const { showToast } = useFeedback();

  if (!isOpen) return null;

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `pedido-${orderId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Código QR descargado', 'success');
  };

  const handleCopyID = () => {
    navigator.clipboard.writeText(orderId);
    showToast('ID copiado al portapapeles', 'success');
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 animate-fade-in">
        {/* Backdrop */}
        <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity"
            onClick={onClose}
        />

        {/* Modal Card */}
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in flex flex-col items-center text-center">
            
            {/* Header Gradient */}
            <div className="absolute top-0 inset-x-0 h-32 bg-linear-to-b from-blue-50 to-white -z-10" />
            
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 transition rounded-full hover:bg-gray-100"
            >
                <X size={20} />
            </button>

            <div className="mt-8 mb-4">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-100">
                    <CheckCircle size={40} strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">¡Pedido Confirmado!</h2>
                <p className="text-gray-500 text-sm mt-1 max-w-[250px] mx-auto">Tu pedido ha sido generado exitosamente.</p>
            </div>

            {/* QR Section */}
            <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-200 shadow-sm relative group mx-8 mb-6">
                <img src={qrCode} alt="QR Pedido" className="w-56 h-56 object-contain mix-blend-multiply" />
                
                {/* ID Badge */}
                <div className="mt-4 flex items-center justify-center gap-2 bg-gray-50 py-2 px-4 rounded-lg cursor-pointer hover:bg-blue-50 transition group/id" onClick={handleCopyID}>
                    <span className="font-mono font-bold text-lg text-gray-800 tracking-wider">#{orderId}</span>
                    <Copy size={16} className="text-gray-400 group-hover/id:text-blue-500" />
                </div>

                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                     <button 
                        onClick={handleDownloadQR}
                        className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg hover:bg-blue-700 transition active:scale-95"
                    >
                        <Download size={14} /> Descargar
                    </button>
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 text-blue-800 p-4 mx-8 rounded-xl text-sm mb-6 text-left w-[calc(100%-4rem)]">
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-blue-100 rounded-full shrink-0 mt-0.5">
                        <QrCode size={16} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="font-bold mb-0.5">Siguientes pasos:</p>
                        <p className="opacity-90 leading-tight">Muestra este código en la caja para pagar <span className="font-bold">{total}</span> y retirar tus productos.</p>
                    </div>
                </div>
            </div>

            {/* Secure Footer */}
            <div className="w-full bg-gray-50 py-3 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
                <ShieldCheck size={14} className="text-gray-400" />
                Pedido seguro y encriptado
            </div>
        </div>
    </div>
  );
}
