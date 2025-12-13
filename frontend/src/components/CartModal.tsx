import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Trash2 } from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { useApp } from '../App';
import type { Cart, Region } from '../types';

// Importar componentes reutilizables
import { Modal } from './Modal';
import { Input, Select } from './FormControls';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const { cart, formatPrice, removeFromCart, forceAppUpdate } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRemoveItem = async (productId: string) => {
    setLoading(true);
    await removeFromCart(productId);
    setLoading(false);
  };

  const handleCheckout = () => {
    // La lógica de checkout ahora se manejará en una página/vista dedicada
    // o directamente en el módulo de Ventas (POS).
    alert("Funcionalidad de 'Pagar en Caja' se encuentra en el módulo de Ventas (POS).");
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <Modal title="Carrito de Compras" isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2" data-testid="cart-items-list">
        {cart && cart.items.length > 0 ? (
          cart.items.map(item => (
            <div key={item.product_id} className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="font-semibold">{item.product_name}</h3>
                <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-bold text-blue-600">
                  {formatPrice(item.subtotal)}
                </p>
                <button
                  onClick={() => handleRemoveItem(item.product_id)}
                  disabled={loading}
                  className="p-2 text-red-500 hover:bg-red-100 rounded-full transition disabled:opacity-50"
                  title="Eliminar item"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 py-8">El carrito está vacío</p>
        )}
      </div>
      
      {cart && cart.items.length > 0 && (
        <>
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal:</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Impuestos (Aprox.):</span>
              <span>{formatPrice(cart.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold mt-2">
              <span>Total:</span>
              <span data-testid="cart-total">{formatPrice(cart.total_with_tax)}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm" data-testid="cart-error">
              <AlertCircle size={18} className="inline mr-2" />
              {error}
            </div>
          )}
          
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="btn-primary w-full"
            data-testid="cart-go-to-pos-btn"
          >
            {loading && <Loader2 size={20} className="animate-spin" />}
            Ir al Módulo de Ventas (POS)
          </button>
        </>
      )}
    </Modal>
  );
}