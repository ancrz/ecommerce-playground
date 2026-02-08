/**
 * CartModal.tsx - Premium Drawer (Stitch Design v3.0)
 * 
 * REFACTORIZADO v3:
 * - Slide-over Sidebar (Drawer) UX
 * - Real-time calculations & animations
 * - Gamification (Free Shipping Progress)
 * - Premium Glassmorphism UI
 */

import React, { useState, useEffect } from 'react';
import { 
    Loader2, 
    Trash2, 
    Plus, 
    Minus, 
    ShoppingBag, 
    X, 
    ArrowRight, 
    Truck, 
    ShieldCheck,
    QrCode,
    Download,
    Copy
} from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { useApp } from '../App';
import { useFeedback } from './ui/FeedbackModal';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const { cart, formatPrice, removeFromCart, setCart } = useApp();
  const { showToast } = useFeedback();
  const [loading, setLoading] = useState<string | null>(null);
  // error state removed as unused
  
  // Checkout State
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  // Gamification Constants
  const FREE_SHIPPING_THRESHOLD = 500;

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Actions
  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    if (!cart) return;
    if (newQuantity <= 0) return handleRemoveItem(productId);
    
    setLoading(productId);
    // setError(''); removed
    try {
      const updatedCart = await api.updateItemQuantity(cart.id, productId, newQuantity);
      setCart(updatedCart);
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    setLoading(productId);
    try {
      await removeFromCart(productId);
      showToast('Eliminado', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Error al eliminar', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleCheckout = async () => {
    if (!cart) return;
    setLoading('checkout');
    // setError(''); removed
    try {
      const response = await api.getCartQR(cart.id);
      setQrCode(response.qr_code);
      setShowQR(true);
    } catch (err: any) {
      showToast(err.message || 'Error generando pedido', 'error');
    } finally {
      setLoading(null);
    }
  };

  // QR Actions
  const handleDownloadQR = () => {
    if (!qrCode) return;
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `pedido-${cart?.customer_id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyID = () => {
    if (!cart) return;
    navigator.clipboard.writeText(cart.customer_id.replace('guest-', '').toUpperCase());
    showToast('ID Copiado', 'success');
  };

  // --- RENDER HELPERS ---
  const isEmpty = !cart || cart.items.length === 0;
  const currentTotal = cart?.total_with_tax || 0;
  const progress = Math.min((currentTotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remaining = FREE_SHIPPING_THRESHOLD - currentTotal;

  if (!isOpen && !showQR) return null;

  // === QR MODAL OVERLAY (Separado del drawer para foco) ===
  if (showQR && qrCode) {
      return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => { setShowQR(false); onClose(); }} />
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-scale-in text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <QrCode size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Pedido Listo!</h2>
                  <p className="text-gray-500 mb-6">Muestra este código en caja para pagar.</p>
                  
                  <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-gray-200 shadow-sm inline-block mb-6 relative group">
                      <img src={qrCode} alt="QR Pedido" className="w-48 h-48 object-contain mix-blend-multiply" />
                      <button onClick={handleDownloadQR} className="absolute bottom-2 right-2 p-2 bg-blue-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <Download size={16} />
                      </button>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">ID de Pedido:</span>
                      <button onClick={handleCopyID} className="flex items-center gap-2 font-mono font-bold text-gray-900 hover:text-blue-600">
                          {cart?.customer_id.replace('guest-', '').toUpperCase()} <Copy size={14} />
                      </button>
                  </div>

                  <button onClick={() => { setShowQR(false); onClose(); }} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition">
                      Entendido
                  </button>
              </div>
          </div>
      )
  }

  // === MAIN DRAWER ===
  return (
    <>
        {/* Backdrop */}
        <div 
            className={`fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        />

        {/* Drawer Panel */}
        <div className={`fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <ShoppingBag size={24} className="text-gray-900" />
                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                            {cart?.items.length || 0}
                        </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Tu Carrito</h2>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition">
                    <X size={24} />
                </button>
            </div>

            {/* Free Shipping Progress */}
            {!isEmpty && (
                <div className="bg-blue-50/50 px-6 py-3 border-b border-blue-100/50">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className={remaining <= 0 ? "text-green-600" : "text-blue-700"}>
                            {remaining <= 0 ? "¡Tienes envío gratis!" : `Agrega $${remaining.toFixed(2)} para envío gratis`}
                        </span>
                        <Truck size={14} className={remaining <= 0 ? "text-green-600" : "text-blue-400"} />
                    </div>
                    <div className="h-1.5 bg-blue-200/50 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${remaining <= 0 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }} 
                        />
                    </div>
                </div>
            )}

            {/* Cart Items (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200">
                {isEmpty ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <ShoppingBag size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Tu carrito está vacío</h3>
                        <p className="text-sm text-gray-500 max-w-[200px]">¡Explora nuestra tienda y encuentra las mejores ofertas!</p>
                        <button onClick={onClose} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition">
                            Ir a la Tienda
                        </button>
                    </div>
                ) : (
                    cart!.items.map(item => (
                        <div key={item.product_id} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                            {/* Image Placeholder */}
                            <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 group-hover:border-blue-100 transition-colors">
                                <span className="text-2xl">💊</span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-800 truncate pr-2" title={item.product_name}>
                                            {item.product_name}
                                        </h3>
                                        <button 
                                            onClick={() => handleRemoveItem(item.product_id)}
                                            className="text-gray-300 hover:text-red-500 transition p-0.5"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500">Unidad</p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                                        <button 
                                            onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                                            disabled={loading === item.product_id}
                                            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white rounded-md transition"
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                        <button 
                                            onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                                            disabled={loading === item.product_id}
                                            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white rounded-md transition"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                    <span className="font-bold text-blue-700">
                                        {formatPrice(item.subtotal)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer / Summary */}
            {!isEmpty && (
                <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-gray-500 text-sm">
                            <span>Subtotal</span>
                            <span>{formatPrice(cart!.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 text-sm">
                            <span>Impuestos (Estimado)</span>
                            <span>{formatPrice(cart!.tax_amount)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-2">
                            <span className="font-bold text-gray-900 text-lg">Total</span>
                            <span className="font-extrabold text-3xl text-gray-900 tracking-tight">
                                {formatPrice(cart!.total_with_tax)}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={!!loading}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden group"
                    >
                         {loading === 'checkout' ? (
                             <Loader2 className="animate-spin" />
                         ) : (
                             <>
                                <span className="relative z-10">Proceder al Pago</span>
                                <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-2xl" />
                             </>
                         )}
                    </button>
                    
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                        <ShieldCheck size={14} className="text-green-500" />
                        <span>Transacción Segura Encriptada</span>
                    </div>
                </div>
            )}
        </div>
    </>
  );
}