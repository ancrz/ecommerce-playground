/**
 * ProductDetailModal.tsx
 * Modal de detalle de producto (Orquestador).
 * 
 * REFACTORIZADO v3 (Component Decomposition):
 * - Delega UI a subcomponentes en /products/
 * - Mantiene lógica de orquestación (Data Fetching, WebSocket, Cart Logic)
 */

import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../App';
import * as api from '../api';
import type { Product, ProductCard, ProductImage } from '../types';
import { useStockUpdates } from '../hooks/useStockUpdates';
import WebSocketIndicator from './ui/WebSocketIndicator';

// Importar subcomponentes refactorizados
import { ProductGallery } from './products/ProductGallery';
import { ProductInfo } from './products/ProductInfo';
import { ProductActions } from './products/ProductActions';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | ProductCard | null;
}

export default function ProductDetailModal({ isOpen, onClose, product: initialProduct }: ProductDetailModalProps) {
  const { addToCart, formatPrice } = useApp();
  const queryClient = useQueryClient();
  
  // WebSocket Hook
  const { status: wsStatus, subscribeToProduct, unsubscribeFromProduct } = useStockUpdates({
    autoConnect: true,
    invalidateQueries: true,
    onStockUpdate: (event) => {
      if (initialProduct && event.product_id === initialProduct.id) {
        console.log(`Live update: Stock is now ${event.stock}`);
      }
    }
  });

  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const [addingToCart, setAddingToCart] = useState(false);

  // ==================== DATA FETCHING ====================
  const { 
    data: product, 
    isLoading: loadingProduct, 
    refetch: refetchProduct
  } = useQuery({
    queryKey: ['product', initialProduct?.id],
    queryFn: () => api.getProductById(initialProduct!.id),
    enabled: isOpen && !!initialProduct?.id,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  const { data: galleryData, isLoading: loadingGallery } = useQuery({
    queryKey: ['product-gallery', initialProduct?.id],
    queryFn: () => api.getProductGallery(initialProduct!.id),
    enabled: isOpen && !!initialProduct?.id,
    staleTime: 60000,
  });

  // Procesar galería (Lógica de negocio / presentación)
  useEffect(() => {
    if (galleryData && galleryData.length > 0) {
      setGalleryImages(galleryData);
    } else if (product?.image_url || initialProduct?.image_url) {
      setGalleryImages([{
        id: 'main',
        product_id: initialProduct!.id,
        image_url: (product?.image_url || initialProduct?.image_url)!,
        is_main: true,
        display_order: 0
      }]);
    } else {
      setGalleryImages([]);
    }
  }, [galleryData, product?.image_url, initialProduct?.image_url]);

  // ==================== SUBSCRIPCIÓN WS ====================
  useEffect(() => {
    if (isOpen && initialProduct?.id) {
      subscribeToProduct(initialProduct.id);
      return () => unsubscribeFromProduct(initialProduct.id);
    }
  }, [isOpen, initialProduct?.id, subscribeToProduct, unsubscribeFromProduct]);

  // ==================== ACTIONS ====================
  const handleAddToCart = async (quantity: number) => {
    if (!product) return;
    
    setAddingToCart(true);
    try {
      await addToCart(product.id, quantity);
      
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      onClose();
    } catch (error) {
      console.error('Error añadiendo al carrito:', error);
      refetchProduct();
    } finally {
      setAddingToCart(false);
    }
  };

  // ==================== UI HELPERS ====================
  const stock = product?.stock ?? 0;
  const hasDiscount = (product?.is_discount || initialProduct?.is_discount) && 
                      (product?.discount_percentage || initialProduct?.discount_percentage || 0) > 0;
  const stockLow = stock <= 5 && stock > 0;
  const isOutOfStock = stock === 0;

  // ==================== RENDER ====================
  if (!isOpen || !initialProduct) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <div className="flex items-center gap-3">
             <h2 className="text-xl font-bold text-white truncate max-w-[200px] sm:max-w-md">
               {product?.name || initialProduct.name}
             </h2>
             <WebSocketIndicator status={wsStatus} className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchProduct()}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
              title="Actualizar información"
            >
              <RefreshCw size={18} className={loadingProduct ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col md:flex-row p-6 gap-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          
          <ProductGallery 
            images={galleryImages}
            isLoading={loadingGallery}
            productName={product?.name || initialProduct.name}
            isOutOfStock={isOutOfStock}
            discountPercentage={product?.discount_percentage || initialProduct?.discount_percentage}
          />

          <div className="md:w-1/2 flex flex-col gap-4">
            <ProductInfo 
              sku={product?.sku || (initialProduct as Product).sku}
              description={product?.description || initialProduct.description}
              category={product?.category || (initialProduct as Product).category}
            />

            <ProductActions 
              price={product?.price ?? initialProduct.price}
              finalPrice={product?.final_price ?? product?.price ?? initialProduct.price}
              stock={stock}
              loading={loadingProduct}
              isOutOfStock={isOutOfStock}
              stockLow={stockLow}
              hasDiscount={hasDiscount ?? false}
              formatPrice={formatPrice}
              onAddToCart={handleAddToCart}
              addingToCart={addingToCart}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
