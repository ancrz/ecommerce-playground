import React from 'react';

interface ProductInfoProps {
  sku?: string | null;
  description?: string | null;
  category?: string | null;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ sku, description, category }) => {
  return (
    <>
      {/* SKU */}
      {sku && (
        <p className="text-sm text-gray-500">
          SKU: {sku}
        </p>
      )}

      {/* Descripción */}
      <div className="flex-1">
        <h3 className="font-semibold mb-2">Descripción</h3>
        <p className="text-gray-600 leading-relaxed">
          {description || 'Sin descripción disponible.'}
        </p>
      </div>

      {/* Categoría */}
      {category && (
        <div>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
            {category}
          </span>
        </div>
      )}
    </>
  );
};
