/**
 * src/components/products/ProductCard.tsx
 * Design 2: Premium Product Card
 * Used in: HomePage, Grid Views, Search Results
 */
import React, { useState } from 'react';
import { Star, Tag, ShoppingCart, Loader2, Eye } from 'lucide-react';
import { useApp } from '../../App';
import type { Product, ProductCard as ProductCardType } from '../../types';

interface ProductCardProps {
  product: Product | ProductCardType;
  onClick: (product: Product | ProductCardType) => void;
  className?: string;
  showQuickAdd?: boolean;
}

export default function ProductCard({ product, onClick, className = '', showQuickAdd = true }: ProductCardProps) {
  const { customization, addToCart, formatPrice } = useApp();
  const [isAdding, setIsAdding] = useState(false);

  // Colores seguros
  const primaryColor = customization?.primary_color || '#264192';

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    try {
      await addToCart(product.id, 1);
      // Feedback global se maneja en App o Toast
    } catch (error) {
       console.error(error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div 
      className={`group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full ${className}`}
      onClick={() => onClick(product)}
      data-testid={`product-card-${product.id}`}
    >
      {/* Image Area */}
      <div className="relative aspect-4/3 bg-gray-50 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-100 text-gray-300">
            💊
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.is_featured && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-linear-to-r from-yellow-400 to-amber-500 text-white shadow-sm">
                    <Star size={10} fill="currentColor" /> Destacado
                </span>
            )}
            {product.is_discount && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white shadow-sm animate-pulse-slow">
                    <Tag size={10} /> -{product.discount_percentage}%
                </span>
            )}
             {((product as any).stock || 0) <= 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-800 text-white shadow-sm">
                    Agotado
                </span>
            )}
        </div>

        {/* Quick Actions Overlay (Desktop) */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-center gap-3 opacity-0 group-hover:opacity-100`}>
             <button className="flex items-center gap-2 text-white bg-white/20 hover:bg-white/40 backdrop-blur-md px-3 py-2 rounded-full text-xs font-bold transition-colors">
                <Eye size={14} /> Ver Detalle
             </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-800 text-sm md:text-base mb-1 line-clamp-2 leading-relaxed h-10 group-hover:text-blue-600 transition-colors">
            {product.name}
        </h3>
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 h-8">
            {product.description}
        </p>

        <div className="mt-auto pt-3 flex items-end justify-between border-t border-gray-50">
            {/* Price */}
            <div className="flex flex-col">
                {product.is_discount ? (
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 line-through decoration-gray-300 mb-0.5">
                            {formatPrice(product.price)}
                        </span>
                        <span className="text-lg font-bold text-red-600 leading-none">
                            {formatPrice(product.final_price || 0)}
                        </span>
                    </div>
                ) : (
                    <span className="text-lg font-bold text-gray-800 leading-none" style={{ color: primaryColor }}>
                        {formatPrice(product.price)}
                    </span>
                )}
            </div>

            {/* Quick Add Button */}
            {showQuickAdd && ((product as any).stock || 0) > 0 && (
                <button
                    onClick={handleAddToCart}
                    disabled={isAdding}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
                    style={{ backgroundColor: primaryColor }}
                >
                    {isAdding ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
                </button>
            )}
        </div>
      </div>
    </div>
  );
}
