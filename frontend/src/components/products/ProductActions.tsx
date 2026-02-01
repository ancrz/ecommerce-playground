import React, { useState } from 'react';
import { Plus, Minus, ShoppingCart, Loader2, AlertTriangle } from 'lucide-react';

interface ProductActionsProps {
  price: number;
  finalPrice: number;
  stock: number;
  loading: boolean;
  isOutOfStock: boolean;
  stockLow: boolean;
  hasDiscount: boolean;
  formatPrice: (price: number) => string;
  onAddToCart: (quantity: number) => Promise<void>;
  addingToCart: boolean;
}

export const ProductActions: React.FC<ProductActionsProps> = ({
  price,
  finalPrice,
  stock,
  loading,
  isOutOfStock,
  stockLow,
  hasDiscount,
  formatPrice,
  onAddToCart,
  addingToCart
}) => {
  const [quantity, setQuantity] = useState(1);

  const incrementQuantity = () => {
    if (quantity < stock) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAdd = () => {
    onAddToCart(quantity);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Precio */}
      <div className="flex items-baseline gap-3">
        <span 
          className={`text-3xl font-bold ${isOutOfStock ? 'text-gray-400' : ''}`}
          style={isOutOfStock ? {} : { color: 'var(--color-primary)' }}
        >
          {formatPrice(finalPrice)}
        </span>
        
        {hasDiscount && (
          <span className="text-lg text-gray-400 line-through">
            {formatPrice(price)}
          </span>
        )}
      </div>

      {/* Stock - con indicador de carga */}
      <div className="flex items-center gap-2">
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin text-gray-400" />
            <span className="text-sm text-gray-400">Verificando stock...</span>
          </>
        ) : isOutOfStock ? (
          <>
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-sm text-red-600 font-semibold">
              Producto agotado
            </span>
          </>
        ) : stockLow ? (
          <>
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-sm text-yellow-600 font-medium">
              ¡Solo {stock} en stock!
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-green-600">
              {stock} disponibles
            </span>
          </>
        )}
      </div>

      {/* Selector de cantidad y botón de agregar */}
      {!isOutOfStock ? (
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
          {/* Selector de cantidad */}
          <div className="flex items-center justify-center gap-4 bg-gray-100 rounded-xl p-2">
            <button
              onClick={decrementQuantity}
              disabled={quantity <= 1 || loading}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Minus size={20} />
            </button>
            
            <span className="w-12 text-center font-bold text-lg">{quantity}</span>
            
            <button
              onClick={incrementQuantity}
              disabled={quantity >= stock || loading}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Botón agregar al carrito */}
          <button
            onClick={handleAdd}
            disabled={addingToCart || loading || isOutOfStock}
            className="flex-1 flex items-center justify-center gap-2 text-black font-bold py-3 px-6 rounded-xl transition disabled:opacity-70 hover:opacity-90"
            style={{ backgroundColor: 'var(--color-secondary)' }}
          >
            {addingToCart ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <ShoppingCart size={20} />
            )}
            Agregar al carrito
          </button>
        </div>
      ) : (
        <div className="pt-4 border-t">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <AlertTriangle className="mx-auto mb-2 text-red-500" size={32} />
            <p className="text-red-700 font-semibold">Producto temporalmente agotado</p>
            <p className="text-red-600 text-sm mt-1">
              Te notificaremos cuando esté disponible
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
