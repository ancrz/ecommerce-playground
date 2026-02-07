import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, Loader2, Star, Tag, ShoppingCart } from "lucide-react";

import * as api from "../api";
import { useApp } from "../App";
import { useFeedback } from "../components/ui/FeedbackModal";
import type { Product } from "../types";
import { TouchButton } from "../components/common/TouchButton";
import ProductDetailModal from "../components/ProductDetailModal";

const SERVER_URL = "";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";

  const { addToCart, formatPrice } = useApp();
  const { showToast } = useFeedback();

  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  
  // Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadAllProducts = useCallback(async () => {
      setLoading(true);
      try {
          // Fetch generic list of products (maybe paginated later)
          const all = await api.getAllProducts(0, 50);
          setProducts(all);
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  }, []);

  const handleSearch = useCallback(async (text: string) => {
    setLoading(true);
    try {
      const results = await api.searchProducts(text);
      setProducts(results);
    } catch (error) {
      console.error("Error searching:", error);
      showToast("Error al buscar productos", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (initialQuery) {
      void handleSearch(initialQuery);
    } else {
        // Load initial "All Products" if no query?
        void loadAllProducts();
    }
  }, [initialQuery, handleSearch, loadAllProducts]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } else {
        navigate('/search'); // Clear
        void loadAllProducts();
    }
  };

  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setAddingId(product.id);
    try {
      await addToCart(product.id, 1);
      showToast("Producto agregado", "success");
    } catch (error: unknown) {
      showToast((error as Error).message || "Error", "error");
    } finally {
      setAddingId(null);
    }
  };
  
  const openDetail = (product: Product) => {
      setSelectedProduct(product);
      setShowDetail(true);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Search Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Catálogo de Productos</h1>
        <form onSubmit={onSearchSubmit} className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, componente o SKU..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              autoFocus
            />
          </div>
          <TouchButton 
            type="submit" 
            variant="primary" 
            className="w-auto px-6"
            loading={loading}
          >
            Buscar
          </TouchButton>
        </form>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 size={48} className="animate-spin mb-4" />
          <p>Buscando productos...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed">
          <Search size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-xl text-gray-500 font-medium">No se encontraron productos</p>
          <p className="text-gray-400 mt-2">Intenta con otro término de búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => openDetail(product)}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 overflow-hidden cursor-pointer flex flex-col group"
            >
              {/* Image Area */}
              <div className="relative aspect-square bg-gray-50 p-4 flex items-center justify-center">
                {product.image_url ? (
                  <img
                    src={`${SERVER_URL}${product.image_url}?t=${product.updated_at}`}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-4xl opacity-20">💊</div>
                )}
                
                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.is_featured && (
                    <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star size={10} /> TOP
                    </span>
                    )}
                    {product.is_discount && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Tag size={10} /> -{product.discount_percentage}%
                    </span>
                    )}
                </div>
              </div>

              {/* Content Area */}
              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-semibold text-gray-800 text-sm md:text-base leading-tight mb-1 line-clamp-2 min-h-[2.5em]">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 mb-2 line-clamp-1">{product.sku}</p>
                
                <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                        {product.is_discount && (
                            <span className="text-[10px] text-gray-400 line-through">
                             {formatPrice(product.price)}
                            </span>
                        )}
                        <span className="font-bold text-blue-700 text-lg">
                            {formatPrice(product.final_price || product.price)}
                        </span>
                    </div>
                    
                    <button
                        onClick={(e) => handleAddToCart(e, product)}
                        disabled={addingId === product.id || product.stock === 0}
                        className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition shadow-sm active:scale-95 disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                        {addingId === product.id ? <Loader2 size={20} className="animate-spin" /> : <ShoppingCart size={20} />}
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

       <ProductDetailModal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        product={selectedProduct}
      />
    </div>
  );
}
