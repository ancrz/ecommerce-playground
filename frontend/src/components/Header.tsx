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
      padding: '1rem 2rem',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }} data-testid="header-public">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4">
          {/* REFACTOR: Mostrar Isotipo (Siempre visible, o solo móvil? Usuario dice: mobile solo isotipo) */}
          {businessInfo?.icon_url && (
            <img 
              src={`${SERVER_URL}${businessInfo.icon_url}?t=${businessInfo.updated_at}`} 
              alt="Isotipo" 
              className="h-8 w-8 object-contain" 
            />
          )}

          {/* REFACTOR: Mostrar Logo (Oculto en móvil, visible en desktop) */}
          {businessInfo?.logo_url ? (
            <img 
              src={`${SERVER_URL}${businessInfo.logo_url}?t=${businessInfo.updated_at}`} 
              alt="Logo" 
              className="h-12 w-auto object-contain hidden md:block" 
            />
          ) : (
             /* Fallback: Si no hay logo, mostrar texto solo en desktop si hay isotipo */
             !businessInfo?.icon_url && <h1 className="text-2xl font-bold">{businessInfo?.name || 'E-Commerce Core'}</h1>
          )}
        </Link>
        
        {/* Search Bar - Visible on Desktop, Hidden on Mobile (Mobile uses BottomNav Search) */}
        <div className="flex-1 max-w-xl mx-8 hidden md:block">
          <form onSubmit={handleSearch} className="relative group">
             <input 
               type="text" 
               placeholder="Buscar productos..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-white/10 text-white placeholder-white/70 border border-white/20 rounded-full py-2 px-5 pr-10 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/50 transition-all"
             />
             <button 
               type="submit"
               className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition"
             >
               <Search size={20} />
             </button>
          </form>
        </div>

        <div className="flex items-center gap-6">
          {/* Selector de Moneda (Oculto en móvil si no cabe, o visible siempre? Dejémoslo hidden md:block si es secundario, o visible) 
              Industry standard: Currency usually in footer or menu on mobile. Let's hide on small screens to save space. */}
          <div className="hidden md:flex items-center gap-2">
            <select
              // REFACTOR FASE 3: Usar el objeto
              value={selectedCurrency?.id || ''}
              onChange={handleCurrencyChange}
              className="px-3 py-2 rounded-lg text-gray-800 focus:ring-2 focus:ring-yellow-400 border-none"
              data-testid="currency-select"
              disabled={!selectedCurrency} // Deshabilitar mientras carga
            >
              {currencies.map(currency => (
                <option key={currency.id} value={currency.id}>
                  {currency.symbol}
                </option>
              ))}
            </select>
          </div>
          
          {/* Botón de Carrito (Visible en Desktop, en Móvil está en BottomBar) */}
          <button
            onClick={showCartModal}
            className="relative p-2 hover:bg-white/10 rounded-lg transition hidden md:block" 
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
          
          {/* Lógica de Autenticación (RBAC) - Desktop Only (Mobile uses BottomNav) */}
          {user ? (
            <div className="hidden md:flex items-center gap-4">
                {/* REFACTOR: Enlace al Panel de Usuario o Admin */}
                <Link 
                  to={accountLink}
                  data-testid="account-link"
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                >
                    {hasAdminRole ? <Shield size={20} /> : <User size={20} />}
                    {accountLabel}
                </Link>
                <button
                    onClick={handleLogout}
                    data-testid="logout-button"
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                >
                    <LogOut size={20} />
                    Salir
                </button>
            </div>
          ) : (
            <button
              onClick={showLoginModal}
              data-testid="login-button"
              className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
            >
              <User size={20} />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}