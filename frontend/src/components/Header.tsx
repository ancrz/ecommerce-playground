/**
 * src/components/Header.tsx
 * Encabezado principal del sitio.
 * REFACTORIZADO (FASE 3 & 4):
 * 1. Consume 'selectedCurrency' (objeto).
 * 2. Integra 'UserMenu' para gestión de usuario.
 * 3. Oculta barra de búsqueda en rutas de admin.
 */
import React from 'react';
import { ShoppingCart, User, Search, ChevronDown } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import UserMenu from './UserMenu';

// URL base del servidor (relativa, para el proxy)
const SERVER_URL = '';

export default function Header() {
  // Consume los datos del contexto global
  const {
    customization,
    businessInfo,
    user,
    selectedCurrency, 
    currencies,
    setSelectedCurrency,
    getCartItemCount,
    showCartModal,
    showLoginModal,
    showSearchModal, // <--- DESIGN 5
  } = useApp();

  const location = useLocation();
  const traverse = useNavigate(); // Unused but kept if needed, or remove.
  // const [searchTerm, setSearchTerm] = React.useState(''); // Removed local state

  const cartItemCount = getCartItemCount();
  
  // Asignar colores con fallbacks seguros
  const primaryColor = customization?.primary_color || '#264192';
  const accentColor = customization?.accent_color || '#ffffff';
  const secondaryColor = customization?.secondary_color || '#ffdd00';

  // Determinar si estamos en ruta de admin
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Determinar el enlace del "Panel de Usuario" (RBAC) - Para vista móvil simplificada
  const hasAdminRole = user && user.roles.length > 0;
  const accountLink = hasAdminRole ? "/admin" : "/account";
  
  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrencyId = event.target.value;
    const newCurrency = currencies.find(c => c.id === newCurrencyId);
    if (newCurrency) {
      setSelectedCurrency(newCurrency);
    }
  };

  // handleSearch removed in favor of showSearchModal

  return (
    <header style={{
      backgroundColor: primaryColor,
      color: accentColor,
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }} className="py-4 px-6 md:px-8" data-testid="header-public">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end order-2 md:order-0">
          <Link to="/" className="flex items-center gap-4">
            {/* Isotipo (Always visible) */}
            {businessInfo?.icon_url && (
              <img 
                src={`${SERVER_URL}${businessInfo.icon_url}?t=${businessInfo.updated_at}`} 
                alt="Isotipo" 
                className="h-8 w-8 object-contain" 
              />
            )}

            {/* Logo (Desktop only) */}
            {businessInfo?.logo_url ? (
              <img 
                src={`${SERVER_URL}${businessInfo.logo_url}?t=${businessInfo.updated_at}`} 
                alt="Logo" 
                className="h-10 w-auto object-contain hidden md:block" 
              />
            ) : (
              !businessInfo?.icon_url && <h1 className="text-xl font-bold">{businessInfo?.name || 'E-Commerce'}</h1>
            )}
          </Link>

          {/* Mobile Cart/Login (Simplified) */}
          <div className="flex items-center gap-4 md:hidden">
             <button onClick={showCartModal} className="relative p-2">
                <ShoppingCart size={24} />
                {cartItemCount > 0 && <span style={{ backgroundColor: secondaryColor, color: '#000' }} className="absolute -top-1 -right-1 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{cartItemCount}</span>}
             </button>
             {user ? (
               <Link to={accountLink} className="p-2 bg-white/20 rounded-lg"><User size={20} /></Link>
             ) : (
               <button onClick={showLoginModal} className="p-2 bg-white/20 rounded-lg"><User size={20} /></button>
             )}
          </div>
        </div>
        
        {/* Search Bar - Responsive - Hidden on Admin */}
        {!isAdminRoute && (
          <div className="w-full max-w-xl mx-0 md:mx-8 order-3 md:order-0">
            <button 
              onClick={showSearchModal}
              className="w-full bg-white/10 text-white text-left border border-white/20 rounded-full py-2 px-5 focus:outline-none hover:bg-white/20 hover:border-white/40 transition-all text-sm md:text-base flex items-center justify-between group"
            >
              <span className="opacity-70 group-hover:opacity-100 transition-opacity">Buscar productos...</span>
              <Search size={18} className="opacity-70 group-hover:opacity-100" />
            </button>
          </div>
        )}

        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 relative group">
            <div className="relative">
                <select
                value={selectedCurrency?.id || ''}
                onChange={handleCurrencyChange}
                className="pl-3 pr-8 py-2 rounded-lg bg-white/10 text-white text-sm focus:ring-2 focus:ring-white/50 border border-white/20 appearance-none cursor-pointer hover:bg-white/20 transition font-medium"
                data-testid="currency-select"
                disabled={!selectedCurrency}
                >
                {currencies.map(currency => (
                    <option key={currency.id} value={currency.id} className="text-gray-900 bg-white">
                    {currency.symbol}
                    </option>
                ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/70">
                    <ChevronDown size={14} />
                </div>
            </div>
            {/* Tooltip para descripción (si la hay) */}
            {/* Tooltip para descripción (si la hay) */}
            {selectedCurrency && (
                 <span className="hidden lg:block text-xs text-white/80 font-medium">
                     {/* Symbol is enough */}
                 </span>
            )}
          </div>
          
          <button
            onClick={showCartModal}
            className="relative p-2 hover:bg-white/10 rounded-lg transition" 
            data-testid="cart-button"
          >
            <ShoppingCart size={24} />
            {cartItemCount > 0 && (
              <span style={{ backgroundColor: secondaryColor, color: '#000' }}
                    className="absolute -top-1 -right-1 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
              >
                {cartItemCount}
              </span>
            )}
          </button>
          
          {user ? (
            <UserMenu />
          ) : (
            <button
              onClick={showLoginModal}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition text-sm"
            >
              <User size={18} />
              <span>Ingresar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}