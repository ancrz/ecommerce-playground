/**
 * ProductDetailModal.tsx
 * Modal de detalle de producto (Review - Premium Design v4).
 * 
 * REFACTORIZADO v4:
 * - Implementación Visual Premium (Stitch Principles)
 * - Glassmorphism Headers
 * - Smooth Transitions
 * - Enhanced Typography & Spacing
 */

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../App';
import * as api from '../api';
import type { Product, ProductCard, ProductImage } from '../types';
import { useStockUpdates } from '../hooks/useStockUpdates';

// Importar subcomponentes refactorizados (Stitch)
import { ProductGallery } from './products/ProductGallery';
// ProductInfo un-used import removed
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
  const [showSuccessTick, setShowSuccessTick] = useState(false);

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
        const imgUrl = product?.image_url || initialProduct?.image_url;
        if(imgUrl){
             setGalleryImages([{
                id: 'main',
                product_id: initialProduct!.id,
                image_url: imgUrl,
                is_main: true,
                display_order: 0
            }]);
        }
    } else {
      setGalleryImages([]);
    }
  }, [galleryData, product?.image_url, initialProduct]);

  // ==================== SUBSCRIPCIÓN WS ====================
  useEffect(() => {
    if (isOpen && initialProduct?.id) {
      subscribeToProduct(initialProduct.id);
      return () => unsubscribeFromProduct(initialProduct.id);
    }
  }, [isOpen, initialProduct?.id, subscribeToProduct, unsubscribeFromProduct]);

  // ==================== ACTIONS ====================
  const handleAddToCart = async (quantity: number) => {
    if (!product && !initialProduct) return;
    const targetId = product?.id || initialProduct!.id;

    setAddingToCart(true);
    try {
      await addToCart(targetId, quantity);
      
      queryClient.invalidateQueries({ queryKey: ['product', targetId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      // Feedback Visual dentro del modal
      setShowSuccessTick(true);
      setTimeout(() => {
        setShowSuccessTick(false);
        onClose();
      }, 800);

    } catch (error) {
      console.error('Error añadiendo al carrito:', error);
      refetchProduct();
    } finally {
      setAddingToCart(false);
    }
  };

  // ==================== UI HELPERS ====================
  const targetProduct = product || (initialProduct as Product);
  const stock = targetProduct?.stock ?? 0;
  const hasDiscount = (targetProduct?.is_discount) && (targetProduct?.discount_percentage || 0) > 0;
  const stockLow = stock <= 5 && stock > 0;
  const isOutOfStock = stock === 0;

  // ==================== RENDER ====================
  if (!isOpen || !initialProduct) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
        
        {/* Backdrop con Blur Premium */}
        <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={onClose}
        />

        {/* Modal Card */}
        <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-scale-in">
            
            {/* Botón Cerrar Flotante */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-20 p-2 bg-white/80 backdrop-blur-md rounded-full text-gray-500 hover:text-gray-900 shadow-sm hover:shadow-md transition-all"
            >
                <X size={24} />
            </button>

            {/* Columna Izquierda: Galería Visual */}
            <div className="md:w-1/2 bg-gray-50 relative flex flex-col">
                 <ProductGallery 
                    images={galleryImages}
                    isLoading={loadingGallery}
                    productName={targetProduct.name}
                    isOutOfStock={isOutOfStock}
                    discountPercentage={targetProduct.discount_percentage}
                />
            </div>

            {/* Columna Derecha: Información y Acciones */}
            <div className="md:w-1/2 p-8 md:p-10 flex flex-col overflow-y-auto custom-scrollbar">
                
                {/* Header Section */}
                <div className="mb-6">
                     <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                        {targetProduct.category ? (
                             <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                                {targetProduct.category}
                             </span>
                        ) : null}
                        <span className="font-mono text-xs opacity-70">SKU: {targetProduct.sku}</span>
                        
                        {/* Live Stock Indicator */}
                        <div className={`ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                            wsStatus === 'connected' ? 'bg-green-50 text-green-700 border-green-200' : 
                            wsStatus === 'connecting' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                            'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                            {wsStatus === 'connected' ? 'Live' : 'Offline'}
                        </div>
                     </div>

                     <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
                        {targetProduct.name}
                     </h2>

                     <div className="flex items-baseline gap-4 mb-6 border-b border-gray-100 pb-6">
                        {hasDiscount ? (
                            <>
                                <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                                    {formatPrice(targetProduct.final_price || targetProduct.price)}
                                </span>
                                <span className="text-xl text-gray-400 line-through decoration-red-500/30">
                                    {formatPrice(targetProduct.price)}
                                </span>
                            </>
                        ) : (
                            <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                                {formatPrice(targetProduct.price)}
                            </span>
                        )}
                     </div>
                </div>

                {/* Description Body */}
                <div className="prose prose-blue text-gray-600 mb-8 grow">
                    <p className="leading-relaxed">
                        {targetProduct.description || "No hay descripción detallada disponible para este producto."}
                    </p>
                    
                    {/* Feature Highlights (Mocked for generic products) */}
                    <ul className="mt-4 space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                            <Check size={16} className="text-green-500" /> Disponibilidad inmediata
                        </li>
                        <li className="flex items-center gap-2">
                            <Check size={16} className="text-green-500" /> Garantía Farmalux
                        </li>
                        <li className="flex items-center gap-2">
                            <Check size={16} className="text-green-500" /> Envío seguro
                        </li>
                    </ul>
                </div>

                {/* Actions Footer */}
                <div className="mt-auto pt-6 bg-white sticky bottom-0">
                    <ProductActions 
                        price={targetProduct.price}
                        finalPrice={targetProduct.final_price || targetProduct.price}
                        stock={stock}
                        loading={loadingProduct}
                        isOutOfStock={isOutOfStock}
                        stockLow={stockLow}
                        hasDiscount={hasDiscount ?? false}
                        formatPrice={formatPrice}
                        onAddToCart={(qty) => handleAddToCart(qty)}
                        addingToCart={addingToCart}
                    />
                    {showSuccessTick && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-xl animate-fade-in-up z-10">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Check size={32} strokeWidth={3} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">¡Agregado!</h3>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    </div>
  );
}
