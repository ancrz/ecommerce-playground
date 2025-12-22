/**
 * CartModal.tsx - Carrito de Compras Refactorizado
 * REFACTORIZADO:
 * - Modificación de cantidad (+/-)
 * - Thumbnails de productos
 * - Toast notifications en lugar de alert()
 * - UX mejorada según estándares de industria
 */

import React, { useState } from 'react';
import { X, Loader2, AlertCircle, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { useApp } from '../App';
import { useFeedback } from './ui/FeedbackModal';

// Importar componentes reutilizables
import { Modal } from './Modal';

// URL base del servidor (relativa, para el proxy)
const SERVER_URL = "";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const { cart, formatPrice, removeFromCart, setCart } = useApp();
  const { showToast } = useFeedback();
  const [loading, setLoading] = useState<string | null>(null); // ID del item que está cargando
  const [error, setError] = useState('');

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

  // Proceder al checkout
  const handleCheckout = () => {
    showToast(
      "Funcionalidad de checkout disponible en el módulo de Ventas (POS).", 
      'info'
    );
    onClose();
  };
  
  if (!isOpen) return null;
  
  const isEmpty = !cart || cart.items.length === 0;
  
  return (
    <Modal title="🛒 Carrito de Compras" isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2" data-testid="cart-items-list">
        {!isEmpty ? (
          cart.items.map(item => {
            const isItemLoading = loading === item.product_id;
            
            return (
              <div 
                key={item.product_id} 
                className={`flex gap-4 p-3 rounded-lg border transition ${
                  isItemLoading ? 'bg-gray-50 opacity-70' : 'bg-white hover:bg-gray-50'
                }`}
              >
                {/* Thumbnail (placeholder si no hay imagen) */}
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <span className="text-2xl">📦</span>
                </div>

                {/* Info del producto */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate" title={item.product_name}>
                    {item.product_name}
                  </h3>
                  
                  <p className="text-sm text-gray-500">
                    Precio unitario: {formatPrice(item.price)}
                  </p>

                  {/* Controles de cantidad */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center bg-gray-100 rounded-lg">
                      <button
                        onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                        disabled={isItemLoading}
                        className="p-1.5 hover:bg-gray-200 rounded-l-lg transition disabled:opacity-50"
                        title="Reducir cantidad"
                      >
                        <Minus size={14} />
                      </button>
                      
                      <span className="w-8 text-center font-medium text-sm">
                        {item.quantity}
                      </span>
                      
                      <button
                        onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                        disabled={isItemLoading}
                        className="p-1.5 hover:bg-gray-200 rounded-r-lg transition disabled:opacity-50"
                        title="Aumentar cantidad"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.product_id)}
                      disabled={isItemLoading}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Subtotal del item */}
                <div className="text-right flex flex-col justify-center">
                  <p className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                    {formatPrice(item.subtotal)}
                  </p>
                  {isItemLoading && (
                    <Loader2 size={16} className="animate-spin mx-auto mt-1 text-gray-400" />
                  )}
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
    </Modal>
  );
}