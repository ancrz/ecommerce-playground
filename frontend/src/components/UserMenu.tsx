import { useState, useRef, useEffect } from 'react';
import { LogOut, Globe, ChevronDown, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';

export default function UserMenu() {
  const { user, handleLogout } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('app_lang') || 'es');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('app_lang', newLang);
    // In a real app, this would trigger an i18n context update
    // window.location.reload(); // Optional: Reload to apply changes if strictly needed
  };

  if (!user) return null;

  const displayName = user.full_name || user.username;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition group"
        data-testid="user-menu-trigger"
      >
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="hidden md:block text-sm font-medium text-white max-w-[100px] truncate">
          {displayName.split(' ')[0]}
        </span>
        <ChevronDown 
          size={16} 
          className={`text-white/70 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          
          {/* User Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1">
               {user.roles.map(role => (
                   <span key={role} className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md font-medium uppercase tracking-wider">
                       {role}
                   </span>
               ))}
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {/* Language Selector */}
            <div className="px-3 py-2 flex items-center justify-between rounded-lg hover:bg-gray-50 transition cursor-pointer" onClick={toggleLanguage}>
                <div className="flex items-center gap-3 text-gray-700">
                    <Globe size={18} className="text-gray-400" />
                    <span className="text-sm">Idioma</span>
                </div>
                <div className="flex bg-gray-200 rounded-lg p-0.5">
                    <button 
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition ${language === 'es' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    >
                        ES
                    </button>
                    <button 
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition ${language === 'en' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                    >
                        EN
                    </button>
                </div>
            </div>

            <div className="h-px bg-gray-100 my-1" />

            {/* Admin Panel Link */}
            {user.roles && user.roles.length > 0 && (
              <>
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  <div className="p-1 bg-blue-100 rounded text-blue-600">
                    <LayoutDashboard size={14} />
                  </div>
                  Panel de Admin
                </Link>
                <div className="h-px bg-gray-100 my-1" />
              </>
            )}

            {/* Logout */}
            <button
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium"
              data-testid="logout-button"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
