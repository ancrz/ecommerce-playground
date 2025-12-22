/**
 * ProductDetailModal.tsx
 * Modal de detalle de producto con galería de imágenes y selector de cantidad.
 * 
 * REFACTORIZADO v2:
 * - Carga producto completo (con stock) al abrir
 * - Usa React Query para cache y invalidación
 * - Preparado para WebSocket (futuro)
 * - Manejo de stock en tiempo real
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ShoppingCart, Plus, Minus, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../App';
import * as api from '../api';
import type { Product, ProductCard } from '../types';
import { useStockUpdates } from '../hooks/useStockUpdates'; // NEW
import WebSocketIndicator from './ui/WebSocketIndicator'; // NEW

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Puede recibir ProductCard (sin stock) o Product (completo) */
  product: Product | ProductCard | null;
}

interface GalleryImage {
  id: string;
  image_url: string;
  thumbnail_url?: string | null;
  is_main: boolean;
}

export default function ProductDetailModal({ isOpen, onClose, product: initialProduct }: ProductDetailModalProps) {
  const { addToCart, formatPrice } = useApp();
  const queryClient = useQueryClient();
  
  // WebSocket Hook - Suscripción automática a actualizaciones
  const { status: wsStatus, subscribeToProduct, unsubscribeFromProduct } = useStockUpdates({
    autoConnect: true,
    invalidateQueries: true, // Refetch automático al recibir evento
    onStockUpdate: (event) => {
      if (initialProduct && event.product_id === initialProduct.id) {
        // Feedback visual opcional (toast, flash, etc)
        console.log(`Live update: Stock is now ${event.stock}`);
      }
    }
  });

  // Estado del modal
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  // ==================== CARGA DE PRODUCTO COMPLETO ====================
  // Usar React Query para cargar el producto completo con stock actualizado
  const { 
    data: product, 
    isLoading: loadingProduct, 
    isError: productError,
    refetch: refetchProduct
  } = useQuery({
    queryKey: ['product', initialProduct?.id],
    queryFn: () => api.getProductById(initialProduct!.id),
    enabled: isOpen && !!initialProduct?.id,
    staleTime: 30000, // 30 segundos antes de considerar stale
    refetchOnWindowFocus: true, // Refetch cuando el usuario vuelve a la ventana
    refetchInterval: false, // Desactivar polling (usaremos WebSocket en futuro)
  });

  // Reset estado cuando se abre con un nuevo producto
  useEffect(() => {
    if (isOpen && initialProduct) {
      setQuantity(1);
      setActiveImageIndex(0);
    }
  }, [isOpen, initialProduct?.id]);

  // ==================== CARGA DE GALERÍA ====================
  const { data: galleryData, isLoading: loadingGallery } = useQuery({
    queryKey: ['product-gallery', initialProduct?.id],
    queryFn: () => api.getProductGallery(initialProduct!.id),
    enabled: isOpen && !!initialProduct?.id,
    staleTime: 60000, // 1 minuto
  });

  // Procesar galería
  useEffect(() => {
    if (galleryData && galleryData.length > 0) {
      setGalleryImages(galleryData);
    } else if (product?.image_url || initialProduct?.image_url) {
      // Fallback a imagen principal
      setGalleryImages([{
        id: 'main',
        image_url: (product?.image_url || initialProduct?.image_url)!,
        is_main: true
      }]);
    } else {
      setGalleryImages([]);
    }
  }, [galleryData, product?.image_url, initialProduct?.image_url]);

  // ==================== NAVEGACIÓN DE GALERÍA ====================
  const nextImage = useCallback(() => {
    setActiveImageIndex(prev => (prev + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const prevImage = useCallback(() => {
    setActiveImageIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

  // ==================== MANEJO DE CANTIDAD ====================
  const stock = product?.stock ?? 0;
  
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

  // ==================== AGREGAR AL CARRITO ====================
  const handleAddToCart = async () => {
    if (!product) return;
    
    setAddingToCart(true);
    try {
      await addToCart(product.id, quantity);
      
      // Invalidar queries para refetch de stock actualizado
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      onClose();
    } catch (error) {
      console.error('Error añadiendo al carrito:', error);
      // Refetch producto para ver stock actualizado
      refetchProduct();
    } finally {
      setAddingToCart(false);
    }
  };

  // ==================== SUBSCRIPCIÓN WS ====================
  useEffect(() => {
    if (isOpen && initialProduct?.id) {
      subscribeToProduct(initialProduct.id);
      return () => unsubscribeFromProduct(initialProduct.id);
    }
  }, [isOpen, initialProduct?.id, subscribeToProduct, unsubscribeFromProduct]);

  // ==================== CERRAR CON ESC ====================
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // ==================== RENDER ====================
  if (!isOpen || !initialProduct) return null;

  const currentImage = galleryImages[activeImageIndex];
  const hasDiscount = (product?.is_discount || initialProduct.is_discount) && 
                      (product?.discount_percentage || initialProduct.discount_percentage) > 0;
  const stockLow = stock <= 5 && stock > 0;
  const isOutOfStock = stock === 0;
  const isLoading = loadingProduct || loadingGallery;

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
            {/* Botón de refetch */}
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

        {/* Content */}
        <div className="flex flex-col md:flex-row p-6 gap-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          
          {/* Galería de imágenes */}
          <div className="md:w-1/2 flex flex-col gap-4">
            {/* Imagen principal */}
            <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
              {loadingGallery ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : currentImage ? (
                <>
                  <img
                    src={currentImage.image_url}
                    alt={product?.name || initialProduct.name}
                    className={`w-full h-full object-contain transition ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
                  />
                  
                  {/* Banner de Agotado */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-red-600/90 text-white px-6 py-3 rounded-lg font-bold text-xl transform -rotate-12 shadow-lg">
                        AGOTADO
                      </div>
                    </div>
                  )}
                  
                  {/* Navegación */}
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow hover:bg-white transition"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow hover:bg-white transition"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                  
                  {/* Badge de descuento */}
                  {hasDiscount && !isOutOfStock && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      -{product?.discount_percentage || initialProduct.discount_percentage}%
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  Sin imagen
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2 justify-center flex-wrap">
                {galleryImages.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImageIndex(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                      index === activeImageIndex 
                        ? 'border-blue-500 ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img
                      src={img.thumbnail_url || img.image_url}
                      alt={`Vista ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div className="md:w-1/2 flex flex-col gap-4">
            {/* SKU */}
            {(product?.sku || (initialProduct as Product).sku) && (
              <p className="text-sm text-gray-500">
                SKU: {product?.sku || (initialProduct as Product).sku}
              </p>
            )}

            {/* Precio */}
            <div className="flex items-baseline gap-3">
              <span 
                className={`text-3xl font-bold ${isOutOfStock ? 'text-gray-400' : ''}`}
                style={isOutOfStock ? {} : { color: 'var(--color-primary)' }}
              >
                {formatPrice(product?.final_price ?? product?.price ?? initialProduct.price)}
              </span>
              
              {hasDiscount && (
                <span className="text-lg text-gray-400 line-through">
                  {formatPrice(product?.price ?? initialProduct.price)}
                </span>
              )}
            </div>

            {/* Stock - con indicador de carga */}
            <div className="flex items-center gap-2">
              {loadingProduct ? (
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

            {/* Descripción */}
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Descripción</h3>
              <p className="text-gray-600 leading-relaxed">
                {product?.description || initialProduct.description || 'Sin descripción disponible.'}
              </p>
            </div>

            {/* Categoría */}
            {(product?.category || (initialProduct as Product).category) && (
              <div>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                  {product?.category || (initialProduct as Product).category}
                </span>
              </div>
            )}

            {/* Selector de cantidad y botón de agregar */}
            {!isOutOfStock ? (
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                {/* Selector de cantidad */}
                <div className="flex items-center justify-center gap-4 bg-gray-100 rounded-xl p-2">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1 || loadingProduct}
                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Minus size={20} />
                  </button>
                  
                  <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                  
                  <button
                    onClick={incrementQuantity}
                    disabled={quantity >= stock || loadingProduct}
                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {/* Botón agregar al carrito */}
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart || loadingProduct || isOutOfStock}
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
        </div>
      </div>
    </div>
  );
}
