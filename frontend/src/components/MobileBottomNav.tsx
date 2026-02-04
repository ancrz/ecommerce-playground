import { Home, User, ShoppingCart, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../App';
import { Z_INDEX } from '../constants';

export default function MobileBottomNav() {
  const { user, getCartItemCount } = useApp();
  const cartCount = getCartItemCount();

  if (!user) return null; // Only show for logged in users? Or maybe for everyone? 
  // Requirement says: "mobile usar un navbar para el modo: cuando el usuario inicia sesión."

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
      style={{ zIndex: Z_INDEX.BOTTOM_NAV }}
      data-testid="mobile-bottom-nav"
    >
      <NavLink 
        to="/" 
        className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
      >
        <Home size={24} />
        <span className="text-[10px] mt-1">Inicio</span>
      </NavLink>

      <NavLink 
        to="/account" 
        className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
      >
        <User size={24} />
        <span className="text-[10px] mt-1">Cuenta</span>
      </NavLink>

      {/* Cart Button (Opens Modal via logic, but here acts as visual trigger or link) */}
      {/* If current design uses a Modal for Cart, this might need to call showCartModal context */}
      {/* For now, let's assume valid link or context trigger. 
          Actually, AppContext has showCartModal. 
          Ideally this component should consume context actions.
      */}
      <CartButton />

      {user.roles.includes('admin') && (
        <NavLink 
          to="/admin" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <Settings size={24} />
          <span className="text-[10px] mt-1">Admin</span>
        </NavLink>
      )}
    </nav>
  );
}

function CartButton() {
    const { showCartModal, getCartItemCount } = useApp();
    const count = getCartItemCount();

    return (
        <button 
            onClick={showCartModal}
            className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-blue-600 relative"
        >
            <div className="relative">
                <ShoppingCart size={24} />
                {count > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {count > 9 ? '9+' : count}
                    </span>
                )}
            </div>
            <span className="text-[10px] mt-1">Carrito</span>
        </button>
    )
}
