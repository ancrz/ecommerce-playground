/**
 * src/pages/HomePage.tsx
 * Página principal de la tienda (Storefront).
 * REFACTORIZADO: Carga sus propios datos (sliders, búsqueda) y
 * consume el AppContext (useApp) para precios y carrito.
 */
import React, { useState } from "react";
import {
  Star,
  Tag,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

// Importar API y Contexto
import * as api from "../api";
import * as hooks from "../hooks.generated";
import { useApp } from "../App";
import { useFeedback } from "../components/ui/FeedbackModal";
import type { Product, ProductCard } from "../types";
import ProductDetailModal from "../components/ProductDetailModal";

// URL base del servidor (relativa, para el proxy)
const SERVER_URL = "";

// --- Componente Interno: Slider de Productos ---
function ProductSlider({
  title,
  products,
  customization,
  onProductClick,
}: {
  title: string;
  products: (Product | ProductCard)[];
  customization: any;
  onProductClick?: (product: Product | ProductCard) => void;
}) {
  // REFACTOR: Consume el contexto para precio y carrito
  const { addToCart, formatPrice } = useApp();
  const { showToast } = useFeedback();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [addingProductId, setAddingProductId] = React.useState<string | null>(null);
  const itemsPerPage = 4; // Mostrar 4 productos a la vez

  // Handler para agregar al carrito con feedback
  const handleAddToCart = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddingProductId(productId);
    try {
      await addToCart(productId, 1);
      showToast('¡Producto agregado al carrito!', 'success');
    } catch (error: unknown) {
      showToast((error as Error).message || 'Error al agregar', 'error');
    } finally {
      setAddingProductId(null);
    }
  };

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

  // Productos visibles según la paginación
  const visibleProducts = products.slice(
    currentIndex,
    currentIndex + itemsPerPage
  );

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        {products.length > itemsPerPage && (
          <div className="flex gap-2">
            <button
              onClick={prev}
              disabled={currentIndex === 0}
              style={{
                backgroundColor: customization?.primary_color || "#264192",
              }}
              className="p-2 rounded-full text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:opacity-90 transition"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              disabled={currentIndex >= products.length - itemsPerPage}
              style={{
                backgroundColor: customization?.primary_color || "#264192",
              }}
              className="p-2 rounded-full text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:opacity-90 transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {visibleProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col cursor-pointer"
            data-testid={`product-card-${product.id}`}
            onClick={() => onProductClick?.(product)}
          >
            <div className="relative h-48 bg-gray-100 flex items-center justify-center">
              {product.image_url ? (
                <img
                  // REFACTOR: URL corregida (proxy + cache bust)
                  src={`${SERVER_URL}${product.image_url}?t=${
                    (product as Product).updated_at || "1"
                  }`}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-6xl opacity-30">💊</div>
              )}
              {product.is_featured && (
                <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Star size={12} /> Destacado
                </div>
              )}
              {product.is_discount && (
                <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Tag size={12} /> -{product.discount_percentage}%
                </div>
              )}
            </div>

            <div className="p-4 flex flex-col flex-grow">
              <h3
                className="font-bold text-gray-800 mb-2 h-12 line-clamp-2"
                title={product.name}
              >
                {product.name}
              </h3>
              <p className="text-sm text-gray-600 mb-3 h-10 line-clamp-2">
                {product.description}
              </p>

              <div className="mb-3 h-8 mt-auto">
                {/* REFACTOR: Llama a formatPrice() del contexto */}
                {product.is_discount ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-400 line-through text-sm">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-xl font-bold text-red-600">
                      {formatPrice(product.final_price || 0)}
                    </span>
                  </div>
                ) : (
                  <span
                    className="text-xl font-bold"
                    style={{ color: customization?.primary_color || "#264192" }}
                  >
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>

              <button
                onClick={(e) => handleAddToCart(product.id, e)}
                disabled={addingProductId === product.id}
                style={{
                  backgroundColor: customization?.primary_color || "#264192",
                }}
                className="w-full text-white py-2 rounded-lg hover:opacity-90 transition font-semibold disabled:opacity-70 flex items-center justify-center gap-2"
                data-testid={`add-to-cart-${product.id}`}
              >
                {addingProductId === product.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                {addingProductId === product.id ? 'Agregando...' : 'Agregar al Carrito'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Componente Principal: HomePage ---
export default function HomePage() {
  // REFACTOR: Consume el contexto (solo para colores y la barra de búsqueda)
  const { customization } = useApp();

  // REFACTOR: Usar Hooks Autogenerados
  // Alias de data -> nombre de variable semántica
  const { data: mainData } =
    hooks.useGetSliderProductsApiProductsSliderSliderTypeGet("main");
  const { data: featuredData } =
    hooks.useGetSliderProductsApiProductsSliderSliderTypeGet("featured");
  const { data: discountData } =
    hooks.useGetSliderProductsApiProductsSliderSliderTypeGet("discount");

  const mainProducts = (mainData as ProductCard[]) || [];
  const featuredProducts = (featuredData as ProductCard[]) || [];
  const discountProducts = (discountData as ProductCard[]) || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<(Product | ProductCard)[]>(
    []
  );
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Estado para el modal de detalle de producto
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Handler para abrir el modal de detalle
  const handleProductClick = (product: Product | ProductCard) => {
    // Convertir ProductCard a Product si es necesario (fetch completo)
    setSelectedProduct(product as Product);
    setIsDetailModalOpen(true);
  };

  // REFACTOR: Lógica de búsqueda
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchActive(false); // Desactivar modo búsqueda
      return;
    }
    setLoadingSearch(true);
    setIsSearchActive(true); // Activar modo búsqueda
    try {
      // Llama a la API (Módulo 16)
      const results = await api.searchProducts(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 pb-24 md:pb-12">
      {/* Barra de Búsqueda Responsive */}
      <div className="bg-white shadow-sm p-4 md:py-6 mb-8 rounded-xl border border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Buscar por nombre, SKU..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                data-testid="search-input"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
            <button
              onClick={handleSearch}
              disabled={loadingSearch}
              style={{
                backgroundColor: customization?.secondary_color || "#ffdd00",
                color: "#000",
              }}
              className="px-8 py-3 rounded-xl hover:opacity-90 transition font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm active:scale-95"
              data-testid="search-button"
            >
              {loadingSearch ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Buscar"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sliders de Productos */}

      {/* Mostrar resultados de búsqueda si el modo búsqueda está activo */}
      {isSearchActive ? (
        <ProductSlider
          title={`Resultados para "${searchQuery}"`}
          products={searchResults}
          customization={customization}
          onProductClick={handleProductClick}
        />
      ) : (
        /* Ocultar sliders principales si hay búsqueda */
        <>
          {featuredProducts.length > 0 && (
            <ProductSlider
              title="⭐ Productos Destacados"
              products={featuredProducts}
              customization={customization}
              onProductClick={handleProductClick}
            />
          )}

          {discountProducts.length > 0 && (
            <ProductSlider
              title="🔥 Productos en Descuento"
              products={discountProducts}
              customization={customization}
              onProductClick={handleProductClick}
            />
          )}

          {mainProducts.length > 0 && (
            <ProductSlider
              title="💊 Todos los Productos"
              products={mainProducts}
              customization={customization}
              onProductClick={handleProductClick}
            />
          )}
        </>
      )}

      {/* Modal de Detalle de Producto */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
}
