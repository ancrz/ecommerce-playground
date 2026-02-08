/**
 * src/components/SearchOverlay.tsx
 * Design 5: Enhanced Search Overlay
 * Features: Predictive search, Recent searches, Trending products, Premium UI.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useApp } from '../App';
import * as api from '../api';
import type { Product, ProductCard as ProductCardType } from '../types';
import ProductCard from './products/ProductCard';
import ProductDetailModal from './ProductDetailModal'; // Reuse detail modal

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const { customization } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(Product | ProductCardType)[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Load recent searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults([]);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSearch = async (term: string) => {
    setQuery(term);
    if (term.length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const data = await api.searchProducts(term);
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = (term: string) => {
    if (!term.trim()) return;
    const newHistory = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(newHistory);
    localStorage.setItem('recent_searches', JSON.stringify(newHistory));
  };

  const handleProductClick = (product: Product | ProductCardType) => {
     saveToHistory(query);
     setSelectedProduct(product as Product);
  };

  if (!isOpen) return null;

  const primaryColor = customization?.primary_color || '#264192';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-xl animate-fade-in">
      {/* Header / Search Bar */}
      <div className="w-full max-w-5xl mx-auto px-4 pt-6 pb-4 flex items-center gap-4 border-b border-gray-100">
        <Search className="text-gray-400" size={24} />
        <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar productos, marcas, categorías..."
            className="flex-1 text-2xl md:text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-300 text-gray-800 h-16"
        />
        <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
            <X size={28} className="text-gray-500" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
                    <p>Buscando resultados...</p>
                </div>
            ) : query.length >= 2 ? (
                // Results View
                <div>
                     <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">
                        {results.length} Resultados encontrados
                     </h3>
                     {results.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {results.map(product => (
                                <ProductCard 
                                    key={product.id} 
                                    product={product} 
                                    onClick={handleProductClick} 
                                />
                            ))}
                        </div>
                     ) : (
                        <div className="text-center py-20">
                            <p className="text-xl text-gray-400">No encontramos coincidencias para "{query}"</p>
                        </div>
                     )}
                </div>
            ) : (
                // Default View (Recent & Trending)
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     {/* Recent Searches */}
                     {recentSearches.length > 0 && (
                         <div>
                             <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
                                 <Clock size={16} className="text-gray-400" /> Búsquedas Recientes
                             </h3>
                             <div className="flex flex-wrap gap-2">
                                 {recentSearches.map((term, idx) => (
                                     <button
                                        key={idx}
                                        onClick={() => handleSearch(term)}
                                        className="px-4 py-2 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium transition-colors border border-gray-100 flex items-center gap-2"
                                     >
                                         {term}
                                         <ArrowRight size={12} className="opacity-50" />
                                     </button>
                                 ))}
                             </div>
                         </div>
                     )}

                     {/* Mock Trending (Static for now, could come from API) */}
                     <div>
                         <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
                             <TrendingUp size={16} className="text-blue-500" /> Tendencias
                         </h3>
                         <div className="space-y-3">
                             {['Vitaminas', 'Analgésicos', 'Protector Solar', 'Colágeno'].map((term, idx) => (
                                 <button
                                    key={idx}
                                    onClick={() => handleSearch(term)}
                                    className="block w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                                 >
                                     <span className="font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{term}</span>
                                 </button>
                             ))}
                         </div>
                     </div>
                </div>
            )}
        </div>
      </div>
      
      {/* Product Detail Modal (Nested) */}
      <ProductDetailModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
      />
    </div>
  );
}
