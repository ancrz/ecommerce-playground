/**
 * src/pages/HomePage.tsx
 * Página principal de la tienda (Storefront).
 * REFACTORIZADO: Carga sus propios datos (sliders, búsqueda) y
 * consume el AppContext (useApp) para precios y carrito.
 */
import React, { useState, useEffect } from "react";
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
import type { Product, ProductCard } from "../types";

// URL base del servidor (relativa, para el proxy)
const SERVER_URL = "";

// --- Componente Interno: Slider de Productos ---
function ProductSlider({
  title,
  products,
  customization,
}: {
  title: string;
  products: (Product | ProductCard)[];
  customization: any;
}) {
  // REFACTOR: Consume el contexto para precio y carrito
  const { addToCart, formatPrice } = useApp();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const itemsPerPage = 4; // Mostrar 4 productos a la vez

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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {visibleProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
            data-testid={`product-card-${product.id}`}
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
                onClick={() => addToCart(product.id, 1)}
                style={{
                  backgroundColor: customization?.primary_color || "#264192",
                }}
                className="w-full text-white py-2 rounded-lg hover:opacity-90 transition font-semibold"
                data-testid={`add-to-cart-${product.id}`}
              >
                Agregar al Carrito
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Barra de Búsqueda */}
      <div className="bg-white shadow-sm py-6 mb-8 rounded-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Buscar productos por nombre, SKU o descripción..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="search-input"
            />
            <button
              onClick={handleSearch}
              disabled={loadingSearch}
              style={{
                backgroundColor: customization?.secondary_color || "#ffdd00",
                color: "#000",
              }}
              className="px-6 py-3 rounded-lg hover:opacity-90 transition font-semibold flex items-center gap-2 disabled:opacity-50"
              data-testid="search-button"
            >
              {loadingSearch ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Search size={20} />
              )}
              Buscar
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
        />
      ) : (
        /* Ocultar sliders principales si hay búsqueda */
        <>
          {featuredProducts.length > 0 && (
            <ProductSlider
              title="⭐ Productos Destacados"
              products={featuredProducts}
              customization={customization}
            />
          )}

          {discountProducts.length > 0 && (
            <ProductSlider
              title="🔥 Productos en Descuento"
              products={discountProducts}
              customization={customization}
            />
          )}

          {mainProducts.length > 0 && (
            <ProductSlider
              title="💊 Todos los Productos"
              products={mainProducts}
              customization={customization}
            />
          )}
        </>
      )}
    </div>
  );
}
