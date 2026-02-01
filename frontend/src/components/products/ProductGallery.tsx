import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { ProductImage } from '../../types';

interface ProductGalleryProps {
  images: ProductImage[];
  isLoading: boolean;
  productName: string;
  isOutOfStock: boolean;
  discountPercentage?: number;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  isLoading,
  productName,
  isOutOfStock,
  discountPercentage = 0
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const nextImage = () => {
    setActiveImageIndex(prev => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setActiveImageIndex(prev => (prev - 1 + images.length) % images.length);
  };

  const currentImage = images[activeImageIndex];
  const hasDiscount = discountPercentage > 0 && !isOutOfStock;

  return (
    <div className="md:w-1/2 flex flex-col gap-4">
      {/* Imagen principal */}
      <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : currentImage ? (
          <>
            <img
              src={currentImage.image_url}
              alt={productName}
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
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow hover:bg-white transition"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow hover:bg-white transition"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
            
            {/* Badge de descuento */}
            {hasDiscount && (
              <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                -{discountPercentage}%
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
      {images.length > 1 && (
        <div className="flex gap-2 justify-center flex-wrap">
          {images.map((img, index) => (
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
  );
};
