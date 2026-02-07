/**
 * CartModal.tsx - Carrito de Compras Refactorizado
 * REFACTORIZADO:
 * - Modificación de cantidad (+/-)
 * - Thumbnails de productos
 * - Toast notifications en lugar de alert()
 * - UX mejorada según estándares de industria
 */

import React, { useState } from 'react';
import { Loader2, AlertCircle, Trash2, Plus, Minus, ShoppingBag, Copy, Download } from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { useApp } from '../App';
import { useFeedback } from './ui/FeedbackModal';

// Importar componentes reutilizables
import { ResponsiveModal } from './common/ResponsiveModal';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const { cart, formatPrice, removeFromCart, setCart } = useApp();
  const { showToast } = useFeedback();
  const [loading, setLoading] = useState<string | null>(null); // ID del item que está cargando
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null); // QR Code Data URI
  const [showQR, setShowQR] = useState(false); // Toggle QR View

  // Modificar cantidad de un item
  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    if (!cart) return;
    
    if (newQuantity <= 0) {
      await handleRemoveItem(productId);
      return;
    }
    
    setLoading(productId);
    setError('');
    
    try {
      const updatedCart = await api.updateItemQuantity(cart.id, productId, newQuantity);
      setCart(updatedCart);
    } catch (err: any) {
      const message = err.message || 'Error al actualizar cantidad';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(null);
    }
  };

  // Eliminar item del carrito
  const handleRemoveItem = async (productId: string) => {
    if (!cart) return;
    
    setLoading(productId);
    setError('');
    
    try {
      await removeFromCart(productId);
      showToast('Producto eliminado del carrito', 'success');
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    } finally {
      setLoading(null);
    }
  };

  // Proceder al checkout (Generar QR)
  const handleCheckout = async () => {
    if (!cart) return;
    
    setLoading('checkout');
    setError('');

    try {
      // 1. Obtener QR del backend
      const response = await api.getCartQR(cart.id);
      setQrCode(response.qr_code);
      setShowQR(true);
    } catch (err: any) {
      const message = err.message || 'Error al generar código de pedido';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleCopyID = () => {
    if (!cart) return;
    const id = cart.customer_id.replace('guest-', '').toUpperCase();
    navigator.clipboard.writeText(id);
    showToast('ID copiado al portapapeles', 'success');
  };

  const handleDownloadQR = () => {
    if (!qrCode) return;
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `pedido-${cart?.customer_id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setShowQR(false);
    setQrCode(null);
    onClose();
  }
  
  if (!isOpen) return null;
  
  const isEmpty = !cart || cart.items.length === 0;
  
  // VISTA DE QR (CHECKOUT)
  if (showQR && cart && qrCode) {
    return (
      <ResponsiveModal title="Código de Pedido" isOpen={isOpen} onClose={handleClose} size="md" icon={<QrCode className="w-6 h-6" />}>
        <div className="text-center space-y-6 py-4">
          
          <div className="relative group inline-block">
             <div className="bg-white p-4 rounded-xl border shadow-sm">
                <img src={qrCode} alt="Código QR del Pedido" className="w-64 h-64 object-contain" />
             </div>
             <button
                onClick={handleDownloadQR}
                className="absolute shadow-lg bottom-2 right-2 bg-white text-gray-700 p-2 rounded-full hover:bg-gray-50 hover:text-blue-600 transition border"
                title="Descargar QR"
             >
                <Download size={20} />
             </button>
          </div>
          
          <div>
            <p className="text-gray-500 text-sm mb-1 uppercase tracking-wide font-semibold">ID del Pedido</p>
            <div className="flex items-center justify-center gap-2">
                <p className="text-3xl font-mono font-bold text-gray-800 tracking-wider">
                  {cart.customer_id.replace('guest-', '').toUpperCase()}
                </p>
                <button
                    onClick={handleCopyID}
                    className="p-2 text-gray-400 hover:text-blue-600 transition hover:bg-blue-50 rounded-lg"
                    title="Copiar ID"
                >
                    <Copy size={20} />
                </button>
            </div>
          </div>

          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
            <p className="font-bold mb-1">ℹ️ Instrucciones:</p>
            <p>Dirígete al mostrador y muestra este código al vendedor para procesar tu pago y retirar tus productos.</p>
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-4 text-lg">
                <span className="text-gray-600">Total a Pagar:</span>
                <span className="font-bold text-xl" style={{ color: 'var(--color-primary)' }}>
                    {formatPrice(cart.total_with_tax)}
                </span>
            </div>
            
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
            >
              Cerrar y Seguir Comprando
            </button>
          </div>
        </div>
      </Modal>
    );
  }
  
  return (
    <ResponsiveModal title="Carrito de Compras" isOpen={isOpen} onClose={handleClose} size="lg" icon={<ShoppingBag className="w-6 h-6" />}>
      <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2" data-testid="cart-items-list">
        {!isEmpty ? (
          cart.items.map(item => {
            const isItemLoading = loading === item.product_id;
            
            return (
              <div 
                key={item.product_id} 
                className={`flex flex-col sm:flex-row gap-4 p-4 rounded-xl border transition ${
                  isItemLoading ? 'bg-gray-50 opacity-70' : 'bg-white hover:bg-gray-100 hover:shadow-sm'
                }`}
              >
                {/* Mobile Header: Name + Trash */}
                <div className="flex justify-between items-start sm:hidden">
                   <h3 className="font-bold text-gray-900 truncate flex-1" title={item.product_name}>
                    {item.product_name}
                  </h3>
                  <button
                      onClick={() => handleRemoveItem(item.product_id)}
                      disabled={isItemLoading}
                      className="ml-2 p-1 text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                </div>

                {/* Thumbnail + Controls Row */}
                <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-xl shrink-0 flex items-center justify-center overflow-hidden border">
                      <span className="text-3xl">📦</span>
                    </div>

                    <div className="flex-1 sm:hidden flex flex-col justify-center">
                         <p className="font-bold text-lg text-blue-700">
                            {formatPrice(item.subtotal)}
                        </p>
                        <div className="flex items-center bg-gray-100 rounded-lg w-fit mt-1">
                            <button onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)} className="p-1.5"><Minus size={14} /></button>
                            <span className="px-2 font-bold text-sm">{item.quantity}</span>
                            <button onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)} className="p-1.5"><Plus size={14} /></button>
                        </div>
                    </div>
                </div>

                {/* Desktop Info (Hidden on Mobile) */}
                <div className="hidden sm:flex flex-1 min-w-0 flex-col justify-between">
                  <h3 className="font-bold text-gray-800 truncate text-lg" title={item.product_name}>
                    {item.product_name}
                  </h3>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100 rounded-lg">
                      <button
                        onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                        disabled={isItemLoading}
                        className="p-1.5 hover:bg-gray-200 rounded-l-lg transition"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                        disabled={isItemLoading}
                        className="p-1.5 hover:bg-gray-200 rounded-r-lg transition"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.product_id)}
                      disabled={isItemLoading}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Desktop Subtotal (Hidden on Mobile) */}
                <div className="hidden sm:flex text-right flex-col justify-center min-w-[100px]">
                  <p className="font-bold text-xl text-blue-700">
                    {formatPrice(item.subtotal)}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Subtotal</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">El carrito está vacío</p>
            <p className="text-gray-400 text-sm mt-2">
              Agrega productos desde la tienda
            </p>
          </div>
        )}
      </div>
      
      {!isEmpty && (
        <>
          {/* Resumen de totales */}
          <div className="border-t pt-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal ({cart.items.length} productos):</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Impuestos (estimado):</span>
              <span>{formatPrice(cart.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold mt-3 pt-2 border-t">
              <span>Total:</span>
              <span 
                className="text-2xl"
                style={{ color: 'var(--color-primary)' }}
                data-testid="cart-total"
              >
                {formatPrice(cart.total_with_tax)}
              </span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2" data-testid="cart-error">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          
          {/* Botón de checkout */}
          <button
            onClick={handleCheckout}
            disabled={!!loading}
            className="w-full py-3 rounded-xl font-bold text-white transition disabled:opacity-70 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--color-secondary)', color: '#000' }}
            data-testid="cart-go-to-pos-btn"
          >
            {loading && <Loader2 size={20} className="animate-spin" />}
            Proceder al Pago
          </button>
          
          <p className="text-center text-xs text-gray-400 mt-3">
            ✓ Pago seguro · ✓ Envío calculado en checkout
          </p>
        </>
      )}
    </ResponsiveModal>
  );
}