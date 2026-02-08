/**
 * src/pages/HomePage.tsx
 * Página principal de la tienda (Storefront).
 * REFACTORIZADO (FASE 1):
 * - DESIGN 1: Hero Section & Features
 * - DESIGN 2: Uses ProductCard component
 * - Removed local search (moved to Header/SearchOverlay)
 */
import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Truck,
  Phone
} from "lucide-react";

// Importar API y Contexto
import * as hooks from "../hooks.generated";
import { useApp } from "../App";
import type { Product, ProductCard as ProductCardType } from "../types";
import ProductDetailModal from "../components/ProductDetailModal";
import ProductCard from "../components/products/ProductCard";

// SERVER_URL removed as it was unused

// --- Componente Interno: Slider de Productos ---
function ProductSlider({
  title,
  products,
  onProductClick,
}: {
  title: string;
  products: (Product | ProductCardType)[];
  onProductClick: (product: Product | ProductCardType) => void;
}) {
  const { customization } = useApp();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  
  // Responsive items per page
  const itemsPerPage = 4; // Mobile logic could be handled with CSS snap, but keeping simple for now

  const next = () => {
    if (currentIndex < products.length - itemsPerPage) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const visibleProducts = products.slice(
    currentIndex,
    currentIndex + itemsPerPage
  );

  const primaryColor = customization?.primary_color || "#264192";

  return (
    <div className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-1.5 h-8 rounded-full" style={{ backgroundColor: primaryColor }} />
            {title}
        </h2>
        
        {products.length > itemsPerPage && (
          <div className="flex gap-2">
            <button
              onClick={prev}
              disabled={currentIndex === 0}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:border-gray-200 transition-all shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              disabled={currentIndex >= products.length - itemsPerPage}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:border-gray-200 transition-all shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={onProductClick}
          />
        ))}
      </div>
    </div>
  );
}

// --- Componente Principal: HomePage ---
export default function HomePage() {
  const { customization, showSearchModal } = useApp();

  // Data Fetching
  const { data: mainData } = hooks.useGetSliderProductsApiProductsSliderSliderTypeGet("main");
  const { data: featuredData } = hooks.useGetSliderProductsApiProductsSliderSliderTypeGet("featured");
  const { data: discountData } = hooks.useGetSliderProductsApiProductsSliderSliderTypeGet("discount");

  const mainProducts = (mainData as ProductCardType[]) || [];
  const featuredProducts = (featuredData as ProductCardType[]) || [];
  const discountProducts = (discountData as ProductCardType[]) || [];

  // Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleProductClick = (product: Product | ProductCardType) => {
    setSelectedProduct(product as Product);
    setIsDetailModalOpen(true);
  };

  const primaryColor = customization?.primary_color || "#264192";

  return (
    <div className="pb-24 overflow-x-hidden">
      
      {/* HERO SECTION (Design 1) */}
      <section className="relative bg-gray-900 text-white py-20 md:py-32 px-4 overflow-hidden mb-12">
        {/* Background Gradient/Image */}
        <div 
            className="absolute inset-0 z-0 opacity-40 mix-blend-overlay"
            style={{ 
                backgroundImage: 'url("https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80")',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }} 
        />
        <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/60 to-transparent z-0" />
        
        {/* Content */}
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6 animate-fade-in-up">
                <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold backdrop-blur-md text-blue-300">
                    🚀 Envíos a todo el país
                </span>
                <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
                    Tu salud <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-teal-400">al mejor precio</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-300 max-w-xl leading-relaxed">
                    Descubre nuestra amplia selección de medicamentos, productos de cuidado personal y bienestar. Calidad garantizada.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button 
                        onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Ver Ofertas <TrendingUp size={20} />
                    </button>
                    <button 
                        onClick={showSearchModal}
                        className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold backdrop-blur-md border border-white/20 transition-all flex items-center justify-center gap-2"
                    >
                        Buscar Producto
                    </button>
                </div>
            </div>
            
            {/* Visual Element (3D Mockup or Image) */}
            <div className="flex-1 hidden md:block relative animate-fade-in">
                 {/* Abstract visual representation */}
                 <div className="relative w-full aspect-square max-w-md mx-auto">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl" />
                    <img 
                        src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80" 
                        alt="Pharmacy" 
                        className="relative z-10 rounded-3xl shadow-2xl border-4 border-white/10 rotate-3 hover:rotate-0 transition-transform duration-700 object-cover w-full h-full"
                    />
                 </div>
            </div>
        </div>
      </section>

      {/* FEATURES STRIP */}
      <section className="bg-white border-y border-gray-100 py-12 mb-16">
           <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
               <Feature 
                  icon={ShieldCheck} 
                  title="Calidad Garantizada" 
                  desc="Productos certificados y originales de laboratorio." 
                  color="text-blue-600"
               />
               <Feature 
                  icon={Truck} 
                  title="Envío Express" 
                  desc="Recibe tu pedido en menos de 24 horas." 
                  color="text-green-600"
               />
               <Feature 
                  icon={Phone} 
                  title="Soporte 24/7" 
                  desc="Atención farmacéutica personalizada." 
                  color="text-purple-600"
               />
           </div>
      </section>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4">
        {featuredProducts.length > 0 && (
            <ProductSlider
              title="Productos Destacados"
              products={featuredProducts}
              onProductClick={handleProductClick}
            />
        )}

        {discountProducts.length > 0 && (
            <ProductSlider
              title="Ofertas Imperdibles"
              products={discountProducts}
              onProductClick={handleProductClick}
            />
        )}

        {mainProducts.length > 0 && (
            <ProductSlider
              title="Novedades"
              products={mainProducts}
              onProductClick={handleProductClick}
            />
        )}
      </div>

      {/* Modal de Detalle de Producto */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
}

// Sub-component for features
interface FeatureProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
}

const Feature = ({ icon: Icon, title, desc, color }: FeatureProps) => (
    <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
        <div className={`p-3 rounded-2xl bg-gray-50 ${color}`}>
            <Icon size={28} />
        </div>
        <div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">{title}</h3>
            <p className="text-gray-500 leading-relaxed">{desc}</p>
        </div>
    </div>
);
