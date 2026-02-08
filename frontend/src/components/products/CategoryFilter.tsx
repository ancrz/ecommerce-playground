import React from 'react';
import { Filter, X, Check } from 'lucide-react';
import { useApp } from '../App';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

// --- Stitch Design System v3.0: Category Filter ---
// - Glassmorphism Sidebar
// - Smooth transitions
// - Premium pill selectors

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  isOpen,
  onClose
}: CategoryFilterProps) {
  const { customization } = useApp();
  const primaryColor = customization?.primary_color || "#264192";

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div 
        className={`fixed inset-y-0 left-0 w-80 bg-white/95 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-300 ease-out border-r border-white/20 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Filter size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Filtros</h2>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Categorías</h3>
                
                <div className="space-y-2">
                    <button
                        onClick={() => onSelectCategory(null)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                            selectedCategory === null 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                            : 'bg-gray-50 text-gray-600 hover:bg-white hover:shadow-md'
                        }`}
                    >
                        <span className="font-medium">Todas</span>
                        {selectedCategory === null && <Check size={16} />}
                    </button>

                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => onSelectCategory(category)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                                selectedCategory === category 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                                : 'bg-gray-50 text-gray-600 hover:bg-white hover:shadow-md'
                            }`}
                        >
                            <span className="font-medium">{category}</span>
                            {selectedCategory === category && <Check size={16} />}
                        </button>
                    ))}
                </div>

                {/* Price Range Placeholder (Future Expansion) */}
                <div className="mt-8 pt-8 border-t border-gray-100 opacity-50 pointer-events-none">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Rango de Precio</h3>
                    {/* ... slider component would go here ... */}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                <button 
                    onClick={onClose}
                    className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-xl shadow-gray-900/10 hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95"
                >
                    Ver Resultados
                </button>
            </div>
        </div>
      </div>
    </>
  );
}
