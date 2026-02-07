/**
 * src/components/Header.tsx
 * Encabezado principal del sitio.
 * REFACTORIZADO (FASE 3):
 * 1. Consume 'selectedCurrency' (objeto) en lugar de 'selectedCurrencyId'.
 * 2. El 'onChange' del selector ahora busca y setea el objeto Currency completo.
 */
import React from 'react';
import { ShoppingCart, User, LogOut, Shield, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
// Importa el hook del contexto
import { useApp } from '../App';

// URL base del servidor (relativa, para el proxy)
const SERVER_URL = '';

export default function Header() {
  // Consume los datos del contexto global
  const {
    customization,
    businessInfo,
    user,
    // REFACTOR FASE 3: Consumir el objeto y la nueva función
    selectedCurrency, 
    currencies,
    setSelectedCurrency,
    // ...
    getCartItemCount,
    showCartModal,
    showLoginModal,
    handleLogout
  } = useApp();

  const cartItemCount = getCartItemCount();
  
  // Asignar colores con fallbacks seguros
  const primaryColor = customization?.primary_color || '#264192';
  const accentColor = customization?.accent_color || '#ffffff';
  const secondaryColor = customization?.secondary_color || '#ffdd00';

  // Determinar el enlace del "Panel de Usuario" (RBAC)
  const hasAdminRole = user && user.roles.length > 0;
  const accountLink = hasAdminRole ? "/admin" : "/account";
  const accountLabel = hasAdminRole ? "Admin Panel" : "Mi Cuenta";
  
  // REFACTOR FASE 3: Nuevo handler para el selector
  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrencyId = event.target.value;
    const newCurrency = currencies.find(c => c.id === newCurrencyId);
    if (newCurrency) {
      setSelectedCurrency(newCurrency);
    }
  };

  // Search Logic
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <header style={{
      backgroundColor: primaryColor,
      color: accentColor,
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }} className="py-4 px-6 md:px-8" data-testid="header-public">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
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
        
        {/* Search Bar - Responsive */}
        <div className="w-full max-w-xl mx-0 md:mx-8 order-3 md:order-none">
          <form onSubmit={handleSearch} className="relative group">
             <input 
               type="text" 
               placeholder="Buscar productos..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-white/10 text-white placeholder-white/70 border border-white/20 rounded-full py-2 px-5 pr-10 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/50 transition-all text-sm md:text-base"
             />
             <button 
               type="submit"
               className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition"
             >
               <Search size={18} />
             </button>
          </form>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <select
              value={selectedCurrency?.id || ''}
              onChange={handleCurrencyChange}
              className="px-3 py-2 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-yellow-400 border-none"
              data-testid="currency-select"
              disabled={!selectedCurrency}
            >
              {currencies.map(currency => (
                <option key={currency.id} value={currency.id}>
                  {currency.symbol}
                </option>
              ))}
            </select>
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
            <div className="flex items-center gap-4">
                <Link 
                  to={accountLink}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition text-sm whitespace-nowrap"
                >
                    {hasAdminRole ? <Shield size={18} /> : <User size={18} />}
                    {accountLabel}
                </Link>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition text-sm"
                >
                    <LogOut size={18} />
                </button>
            </div>
          ) : (
            <button
              onClick={showLoginModal}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition text-sm"
            >
              <User size={18} />
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}