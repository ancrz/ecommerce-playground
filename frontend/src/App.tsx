/**
 * src/App.tsx
 * Componente principal y orquestador.
 * REFACTORIZADO (FASE 4):
 * 1. 'applyGlobalStyles' ahora inyecta los colores del tema
 * como variables CSS globales (ej. --color-primary)
 * para que .btn-primary en index.css funcione.
 */
import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importar Layouts y Páginas (muchas de estas son NUEVAS)
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import AdminPanel from "./pages/AdminPanel";
import UserAccountPage from "./pages/UserAccountPage"; // ¡NUEVO! (Para /account)
import PasswordResetRequestPage from "./pages/PasswordResetRequestPage"; // ¡NUEVO! (Paso 1)
import PasswordResetValidatePage from "./pages/PasswordResetValidatePage"; // ¡NUEVO! (Paso 2)

// Importar Modales (ahora componentes separados)
import LoginModal from "./components/LoginModal";
import CartModal from "./components/CartModal";

// Importar API y Tipos
import * as api from "./api";
import type {
  User,
  Product,
  ProductCard,
  BusinessInfo,
  Customization,
  Currency,
  Cart,
  Region,
} from "./types";

// --- Interfaz del Contexto Global ---
interface AppContextType {
  // Estado
  businessInfo: BusinessInfo | null;
  customization: Customization | null;
  currencies: Currency[];
  regions: Region[]; // <-- REFACTOR FASE 5
  selectedCurrency: Currency | null; // <-- REFACTOR FASE 3
  cart: Cart | null; // <-- REFACTOR FASE 5
  user: User | null; // Objeto User completo (con roles)

  // Acciones
  setSelectedCurrency: (currency: Currency) => void; // <-- REFACTOR FASE 3
  addToCart: (productId: string, quantity: number) => Promise<void>; // <-- REFACTOR FASE 5
  removeFromCart: (productId: string) => Promise<void>; // <-- REFACTOR FASE 5
  getCartItemCount: () => number;
  formatPrice: (priceInBase: number) => string; // Refactorizado
  forceAppUpdate: () => void;

  // Autenticación
  showLoginModal: () => void;
  handleLogout: () => void;

  // Carrito
  showCartModal: () => void;
}

// --- Creación del Contexto ---
export const AppContext = createContext<AppContextType | null>(null);
export const useApp = () => useContext(AppContext)!;
// ---------------------------------

// --- Rutas Protegidas (RBAC) ---
// Protege el panel de usuario (/account)
function ProtectedUserRoute({
  user,
  children,
}: {
  user: User | null;
  children: React.ReactNode;
}) {
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Protege el panel de admin (/admin)
function ProtectedAdminRoute({
  user,
  children,
}: {
  user: User | null;
  children: React.ReactNode;
}) {
  if (!user || user.roles.length === 0) {
    // Si no es usuario O si es un usuario sin roles de admin
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

/**
 * Componente Principal
 */
export default function App() {
  // Estado de la Aplicación
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [customization, setCustomization] = useState<Customization | null>(
    null
  );
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [regions, setRegions] = useState<Region[]>([]); // <-- REFACTOR FASE 5
  // REFACTOR FASE 3: Cambiado de ID (string) a Objeto (Currency | null)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(
    null
  );
  const [cart, setCart] = useState<Cart | null>(null); // <-- REFACTOR FASE 5
  const [user, setUser] = useState<User | null>(null);

  // Estado de UI
  const [showLogin, setShowLogin] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [appKey, setAppKey] = useState(0); // Para forzar recarga

  // Cargar datos iniciales (públicos)
  const loadInitialData = async () => {
    // Helper para llamadas seguras que no rompen la app
    const safeFetch = async <T,>(
      fn: () => Promise<T>,
      fallback: T | null = null
    ) => {
      try {
        return await fn();
      } catch (error) {
        console.warn("Fallo en carga inicial opcional:", error);
        return fallback;
      }
    };

    const business = await safeFetch(() => api.getBusinessInfo());
    const custom = await safeFetch(() => api.getCustomization());

    // Currencies y Regions son arrays, fallback []
    const curr = (await safeFetch(() => api.getCurrencies())) || [];
    const regs = (await safeFetch(() => api.getRegions())) || [];

    if (business) setBusinessInfo(business);
    if (custom) {
      setCustomization(custom);
      applyGlobalStyles(custom);
    }

    setCurrencies(curr);
    setRegions(regs);

    // REFACTOR FASE 3: Setear el objeto completo
    if (curr.length > 0) {
      const baseCurrency = curr.find((c) => c.is_base);
      if (baseCurrency) {
        setSelectedCurrency(baseCurrency);
      } else {
        setSelectedCurrency(curr[0]);
      }
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [appKey]); // Recargar si appKey cambia

  // REFACTOR FASE 5: Inicialización del Carrito Persistente
  useEffect(() => {
    const initializeCart = async () => {
      // No ejecutar hasta que tengamos los datos básicos (moneda y región)
      if (currencies.length === 0 || regions.length === 0) {
        return;
      }

      const cartId = localStorage.getItem("cart_id");

      if (cartId) {
        try {
          const fetchedCart = await api.getCart(cartId);
          setCart(fetchedCart);
          return; // Salir si el carrito se cargó exitosamente
        } catch (error) {
          console.warn(
            "No se pudo cargar el carrito existente. Se creará uno nuevo.",
            error
          );
          localStorage.removeItem("cart_id"); // Limpiar ID inválido
        }
      }

      // Si no hay cartId o si falló la carga, crear un carrito nuevo
      try {
        const baseCurrency = currencies.find((c) => c.is_base) || currencies[0];
        const defaultRegion = regions[0]; // Asumir la primera región como defecto

        // HOMOLOGACIÓN: Usar el nuevo endpoint que genera el ID de invitado en el backend
        const newCart = await api.createGuestCart(
          defaultRegion.id,
          baseCurrency.id
        );
        localStorage.setItem("cart_id", newCart.id);
        setCart(newCart);
      } catch (error) {
        console.error(
          "Error crítico: No se pudo crear un carrito nuevo.",
          error
        );
        alert("Error crítico: No se pudo inicializar el carrito de compras.");
      }
    };

    initializeCart();
  }, [currencies, regions]); // Se ejecuta cuando las monedas y regiones estén listas

  // Cargar usuario desde localStorage al inicio
  useEffect(() => {
    const loadUserFromToken = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        try {
          // Intentar validar el token con el backend
          const fetchedUser = await api.getMe();
          setUser(fetchedUser);
        } catch (e) {
          console.error("Token inválido o expirado, limpiando sesión:", e);
          localStorage.clear(); // Limpiar si el token es inválido
          setUser(null);
        }
      }
    };
    loadUserFromToken();
  }, []);

  // --- Funciones de Contexto ---

  const handleLogin = (tokenResponse: { access_token: string; user: User }) => {
    setUser(tokenResponse.user);
    localStorage.setItem("token", tokenResponse.access_token);
    // REFACTOR: Guardar el objeto User completo
    localStorage.setItem("user", JSON.stringify(tokenResponse.user));
    setShowLogin(false);
  };

  const handleLogout = async () => {
    try {
      if (user) {
        await api.apiLogout();
      }
    } catch (error) {
      console.error("Error en API Logout:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  };

  const addToCart = async (productId: string, quantity: number) => {
    if (!cart) {
      alert(
        "El carrito no está inicializado. Por favor, espere o recargue la página."
      );
      return;
    }
    try {
      const updatedCart = await api.addItem(cart.id, productId, quantity);
      setCart(updatedCart);
      alert("Producto agregado al carrito"); // Feedback al usuario
    } catch (error: any) {
      console.error("Error al agregar al carrito:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!cart) return;
    try {
      const updatedCart = await api.removeItem(cart.id, productId);
      setCart(updatedCart);
    } catch (error: any) {
      console.error("Error al eliminar del carrito:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const getCartItemCount = () => cart?.item_count ?? 0; // <-- REFACTOR FASE 5

  // REFACTOR FASE 3: Actualizado para usar el objeto selectedCurrency
  const formatPrice = (priceInBase: number | string | null | undefined) => {
    const raw = priceInBase ?? 0;
    const price = typeof raw === "string" ? parseFloat(raw) : raw;

    if (isNaN(price)) return "N/A";

    if (!selectedCurrency) {
      // Fallback antes de que carguen las monedas
      return `Bs. ${price.toFixed(2)}`;
    }

    let displayPrice = price;

    // Si la moneda seleccionada NO es la base, convertimos
    if (!selectedCurrency.is_base) {
      // Precio (100 Bs) / Tasa (36.5) = 2.74 USD
      displayPrice = price / selectedCurrency.exchange_rate;
    }

    return `${selectedCurrency.symbol} ${displayPrice.toFixed(2)}`;
  };

  // REFACTOR FASE 4: Actualizado para inyectar variables CSS
  const applyGlobalStyles = (custom: Customization | null) => {
    if (!custom) return;

    // 1. Set global colors as CSS variables
    const root = document.documentElement;
    root.style.setProperty(
      "--color-primary",
      custom.primary_color || "#264192"
    );
    root.style.setProperty(
      "--color-secondary",
      custom.secondary_color || "#ffdd00"
    );
    root.style.setProperty("--color-accent", custom.accent_color || "#ffffff");

    // 2. Set global font
    document.body.style.fontFamily =
      custom.font_family || "Poppins, sans-serif";

    // 3. Apply custom CSS
    const styleTagId = "farmalux-custom-css";
    let styleTag = document.getElementById(
      styleTagId
    ) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleTagId;
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = custom.custom_css || "";
  };

  // Valor del Contexto
  const contextValue: AppContextType = {
    businessInfo,
    customization,
    currencies,
    regions,
    selectedCurrency, // <-- REFACTOR FASE 3
    cart,
    user,
    setSelectedCurrency, // <-- REFACTOR FASE 3
    addToCart,
    removeFromCart,
    getCartItemCount,
    formatPrice,
    forceAppUpdate: () => setAppKey((k) => k + 1),
    showLoginModal: () => setShowLogin(true),
    handleLogout,
    showCartModal: () => setShowCart(true),
  };

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        {/* Modales Globales */}
        <LoginModal
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
        />
        <CartModal isOpen={showCart} onClose={() => setShowCart(false)} />

        {/* Rutas de la aplicación (E2E Test) */}
        <div data-testid="app-container">
          <Routes>
            {/* Rutas Públicas (Layout principal) */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />

              {/* Ruta de Autogestión (Panel de Usuario Híbrido) */}
              <Route
                path="account"
                element={
                  <ProtectedUserRoute user={user}>
                    <UserAccountPage />
                  </ProtectedUserRoute>
                }
              />

              {/* Ruta de Admin (RBAC) */}
              <Route
                path="admin/*"
                element={
                  <ProtectedAdminRoute user={user}>
                    <AdminPanel />
                  </ProtectedAdminRoute>
                }
              />
            </Route>

            {/* Rutas Públicas (Sin Layout principal, ej. Recuperación) */}
            <Route
              path="/password-reset"
              element={<PasswordResetRequestPage />}
            />
            <Route
              path="/password-reset/validate"
              element={<PasswordResetValidatePage />}
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
