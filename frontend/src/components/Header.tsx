/**
 * src/components/Header.tsx
 * Encabezado principal del sitio.
 * REFACTORIZADO (FASE 3):
 * 1. Consume 'selectedCurrency' (objeto) en lugar de 'selectedCurrencyId'.
 * 2. El 'onChange' del selector ahora busca y setea el objeto Currency completo.
 */
import React from 'react';
import { ShoppingCart, User, LogOut, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
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

  return (
    <header style={{
      backgroundColor: primaryColor,
      color: accentColor,
      padding: '1rem 2rem',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }} data-testid="header-public">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4">
          {businessInfo?.logo_url && (
            <img 
              src={`${SERVER_URL}${businessInfo.logo_url}?t=${businessInfo.updated_at}`} 
              alt="Logo" 
              className="h-12 w-auto object-contain" 
            />
          )}

          {/* REFACTOR: Mostrar Isotipo si existe, sino Texto */}
          {businessInfo?.icon_url ? (
            <img 
              src={`${SERVER_URL}${businessInfo.icon_url}?t=${businessInfo.updated_at}`} 
              alt="Isotipo" 
              className="h-8 w-8 object-contain" // Ajustar tamaño según diseño
            />
          ) : (
            <h1 className="text-2xl font-bold">{businessInfo?.name || 'Farmalux'}</h1>
          )}
        </Link>
        
        <div className="flex items-center gap-6">
          {/* Selector de Moneda */}
          <div className="flex items-center gap-2">
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
          
          {/* Botón de Carrito */}
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
          
          {/* Lógica de Autenticación (RBAC) */}
          {user ? (
            <div className="flex items-center gap-4">
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
              Admin
            </button>
          )}
        </div>
      </div>
    </header>
  );
}