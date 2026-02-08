import { Home, User, ShoppingCart, Settings, Search } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../App';
import { Z_INDEX } from '../constants';

// --- Stitch Design System v3.0: Mobile Nav ---
// - Glassmorphism Background
// - Active State Glow
// - Haptic Feedback Simulation (Scale Press)

export default function MobileBottomNav() {
  const { user, showLoginModal, showCartModal, getCartItemCount } = useApp();
  const cartCount = getCartItemCount();

  const navItemClass = ({ isActive }: { isActive: boolean }) => `
    relative flex flex-col items-center justify-center w-full h-full transition-all duration-300
    ${isActive ? 'text-blue-600 scale-105' : 'text-gray-400 hover:text-gray-600'}
  `;

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50 flex justify-around items-center h-18 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe-area-bottom"
      style={{ zIndex: Z_INDEX.BOTTOM_NAV }}
      data-testid="mobile-bottom-nav"
    >
      {/* Home Tab */}
      <NavLink to="/" className={navItemClass}>
        {({ isActive }) => (
            <>
                {isActive && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                <Home size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] mt-1 font-medium ${isActive ? 'opacity-100' : 'opacity-0 translate-y-2'} transition-all duration-300`}>Inicio</span>
            </>
        )}
      </NavLink>

      {/* Account / Login Tab */}
      {user ? (
        <NavLink to="/account" className={navItemClass}>
             {({ isActive }) => (
                <>
                     {isActive && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                    <User size={24} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={`text-[10px] mt-1 font-medium ${isActive ? 'opacity-100' : 'opacity-0 translate-y-2'} transition-all duration-300`}>Cuenta</span>
                </>
             )}
        </NavLink>
      ) : (
        <button 
          onClick={showLoginModal} 
          className="relative flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-blue-600 transition-colors"
        >
          <User size={24} />
          <span className="text-[10px] mt-1 font-medium">Entrar</span>
        </button>
      )}

      {/* Cart Button (Central Action) */}
      <div className="relative -top-5">
          <button 
                onClick={showCartModal}
                className="w-14 h-14 bg-linear-to-tr from-blue-600 to-blue-500 rounded-full text-white shadow-xl shadow-blue-500/30 flex items-center justify-center transform active:scale-90 transition-all duration-200 border-4 border-white"
            >
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                     <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white animate-bounce-short">
                        {cartCount > 9 ? '9+' : cartCount}
                    </span>
                )}
          </button>
      </div>
      
      {/* Search Tab */}
      <NavLink to="/search" className={navItemClass}>
         {({ isActive }) => (
            <>
                 {isActive && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                <Search size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] mt-1 font-medium ${isActive ? 'opacity-100' : 'opacity-0 translate-y-2'} transition-all duration-300`}>Buscar</span>
            </>
         )}
      </NavLink>

      {/* Admin Tab (RBAC) */}
      {user && user.roles.includes('admin') && (
        <NavLink to="/admin" className={navItemClass}>
             {({ isActive }) => (
                <>
                     {isActive && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                    <Settings size={24} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={`text-[10px] mt-1 font-medium ${isActive ? 'opacity-100' : 'opacity-0 translate-y-2'} transition-all duration-300`}>Admin</span>
                </>
             )}
        </NavLink>
      )}
    </nav>
  );
}
