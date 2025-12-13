/**
 * src/pages/AdminPanel.tsx
 * REFACTORIZADO: Este archivo es ahora el "Contenedor de Pestañas" (Controlador).
 * Implementa la lógica RBAC para mostrar/ocultar pestañas.
 * Carga los módulos (chunks) de forma dinámica (lazy) desde la carpeta /admin-modules/.
 *
 * Aplicadas las correcciones de la auditoría (M47):
 * - Imports (useRef, lazy, Suspense, ElementType)
 * - ErrorBoundary (Punto 1)
 * - Lazy Loading + Suspense (Chunks)
 * - useMemo (Estabilidad)
 * - useEffect (Dependencias corregidas)
 * - Referencia de Componente (vs. JSX en 'allTabs')
 * - Accesibilidad (A11y) y E2E (data-testid, roles, keydown, tabIndex)
 * - Cache Busting (Corregido 'Date.now()', fallback seguro)
 * - Tipado (ModuleProps)
 */
import React, { 
    useState, 
    useEffect, 
    useMemo, 
    Suspense, 
    useRef, 
    lazy, 
    ElementType // REFACTOR: Añadido ElementType para tipado
} from 'react';
import { 
  DollarSign, Palette, Building, Package, TrendingUp, 
  Users, Percent, Loader2 
} from 'lucide-react';

// Importar el contexto
import { useApp } from '../App';
// REFACTOR (Punto 1): Importar el Error Boundary
import ErrorBoundary from '../components/ErrorBoundary';

// --- Importación Dinámica (Lazy Loading) de "Chunks" ---
// (REFACTOR: Módulos importados con React.lazy para code-splitting)
const ProductsModule = lazy(() => import('../admin-modules/ProductsModule'));
const SalesModule = lazy(() => import('../admin-modules/SalesModule'));
const FinanceModule = lazy(() => import('../admin-modules/FinanceModule'));
const TaxModule = lazy(() => import('../admin-modules/TaxModule'));
const ContentModule = lazy(() => import('../admin-modules/ContentModule'));
const ThemeModule = lazy(() => import('../admin-modules/ThemeModule'));
const UserManagementModule = lazy(() => import('../admin-modules/UserManagementModule'));
// --- Fin de Chunks ---

// REFACTOR (Punto 2): Documentación de SERVER_URL
// Vacío por defecto para usar el proxy de Vite/Next.js.
// En producción, se poblaría desde 'import.meta.env.VITE_API_URL'
const SERVER_URL = ''; 

// REFACTOR (Punto 4): Tipado estricto para props de módulos
interface ModuleProps {
  onUpdate: () => void;
}

/**
 * Componente de Icono de Módulo
 * Muestra el icono personalizado si existe, o un icono de Lucide como fallback.
 */
const ModuleIcon = ({ 
  url, 
  IconComponent, 
  label, 
  cacheKey 
}: { 
  url?: string | null, 
  IconComponent: ElementType, // REFACTOR: Tipado estricto
  label: string, 
  cacheKey?: string // REFACTOR: Se usa para el cache busting
}) => {
  if (url) {
    // REFACTOR (Punto 3): Se usa 'cacheKey' (timestamp 'updated_at')
    // con un fallback seguro 'static' en lugar de 'Date.now()'.
    const src = `${SERVER_URL}${url}?v=${cacheKey || 'static'}`;
    return <img src={src} alt={`${label} icon`} className="w-5 h-5 object-contain" />;
  }
  return <IconComponent size={20} aria-hidden="true" />;
};


// --- Componente Principal: AdminPanel ---
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState(''); // Inicia vacío
  const { user, forceAppUpdate, customization } = useApp();

  // --- Lógica RBAC (Control de Acceso Basado en Roles) ---
  const userRoles = useMemo(() => new Set(user?.roles || []), [user?.roles]);
  
  // REFACTOR (Punto 8): useMemo optimizado.
  // 'customization' es la única dependencia (para los iconUrl).
  const allTabs = useMemo(() => [
    // REFACTOR (Punto 4): 'component' es ahora una REFERENCIA, no JSX.
    { id: 'products', label: 'Productos', icon: Package, iconUrl: customization?.icon_products_url, roles: ['admin', 'products_manager'], component: ProductsModule },
    { id: 'sales', label: 'Ventas (POS)', icon: TrendingUp, iconUrl: customization?.icon_sales_url, roles: ['admin', 'sales_manager'], component: SalesModule },
    { id: 'finance', label: 'Finanzas', icon: DollarSign, iconUrl: customization?.icon_finance_url, roles: ['admin', 'finance_manager'], component: FinanceModule },
    { id: 'tax', label: 'Impuestos', icon: Percent, iconUrl: customization?.icon_tax_url, roles: ['admin', 'finance_manager'], component: TaxModule },
    { id: 'content', label: 'Contenido', icon: Building, iconUrl: customization?.icon_business_url, roles: ['admin', 'content_manager'], component: ContentModule },
    { id: 'theme', label: 'Tema (Visual)', icon: Palette, iconUrl: customization?.icon_customization_url, roles: ['admin', 'content_manager'], component: ThemeModule },
    { id: 'users', label: 'Usuarios (RBAC)', icon: Users, iconUrl: customization?.icon_users_url, roles: ['admin'], component: UserManagementModule },
  ], [customization]); // 'forceAppUpdate' (función estable) no es dependencia
  
  // Filtrar pestañas basado en los roles del usuario
  const visibleTabs = useMemo(() => allTabs.filter(tab => 
    tab.roles.some(role => userRoles.has(role))
  ), [allTabs, userRoles]);

  // REFACTOR (Punto 3): useEffect optimizado.
  useEffect(() => {
    if (visibleTabs.length > 0) {
      // Comprueba si la pestaña activa actual sigue siendo válida
      const currentTabIsValid = visibleTabs.some(t => t.id === activeTab);
      // Si está vacía o ya no es válida (ej. cambio de roles),
      // establece la primera pestaña visible como activa.
      if (!currentTabIsValid) {
        setActiveTab(visibleTabs[0].id);
      }
    }
  }, [visibleTabs]); // Solo depende de 'visibleTabs'
  

  // --- Manejo de Teclado (Accesibilidad y E2E) ---
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    // REFACTOR (Punto 7): Usar el array de datos 'visibleTabs', no el DOM
    const tabs = visibleTabs;
    if (tabs.length === 0) return;
    
    // REFACTOR (Punto 7): Usar el índice del array, no el dataset
    const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentTabIndex === -1) return;

    let nextIndex = -1;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentTabIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentTabIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== -1) {
      event.preventDefault();
      const nextTabId = tabs[nextIndex].id;
      // Encontrar el botón en el DOM y mover el foco
      const nextTabButton = tabListRef.current?.querySelector(`#admin-tab-${nextTabId}`) as HTMLButtonElement;
      nextTabButton?.focus();
      setActiveTab(nextTabId); // Cambiar la pestaña activa
    }
  };

  // --- Renderizado ---
  
  if (!user) return (
    <div className="flex justify-center items-center p-12">
      <Loader2 size={32} className="animate-spin text-blue-600" />
      <span className="text-xl ml-4 text-gray-700">Cargando...</span>
    </div>
  );
  
  if (visibleTabs.length === 0) {
      return (
        <div className="text-center p-12" data-testid="admin-no-access">
            <h2 className="text-2xl font-bold text-red-600">Acceso Denegado</h2>
            <p className="text-gray-700 mt-2">Este usuario no tiene roles de administración asignados.</p>
        </div>
      );
  }

  // Componente de fallback para React.Suspense
  const ModuleLoader = () => (
    <div className="flex justify-center items-center p-24" data-testid="module-loader">
      <Loader2 size={48} className="animate-spin text-blue-600" />
      <span className="text-2xl ml-4 text-gray-700">Cargando Módulo...</span>
    </div>
  );

  return (
    <div className="min-h-screen" data-testid="admin-panel">
      {/* Navegación por Pestañas (Filtrada por RBAC y A11y) */}
      <div className="bg-white shadow-md border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div 
            className="flex gap-1 overflow-x-auto" 
            role="tablist" 
            aria-label="Panel de Administración"
            ref={tabListRef}
          >
            {visibleTabs.map(tab => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`admin-tab-${tab.id}`} // A11y
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={handleKeyDown} // A11y
                  role="tab" // A11y
                  aria-selected={isSelected} // A11y
                  aria-controls={`admin-panel-${tab.id}`} // A11y (conecta con el panel)
                  tabIndex={isSelected ? 0 : -1} // A11y (manejo de foco)
                  data-testid={`admin-tab-${tab.id}`} // E2E
                  
                  // REFACTOR (Corregido): 'F' eliminada
                  className={`px-6 py-4 font-semibold transition flex items-center gap-2 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 ${
                    isSelected
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  <ModuleIcon 
                    url={tab.iconUrl} 
                    IconComponent={tab.icon} 
                    label={tab.label}
                    // REFACTOR (Punto 3): Cache bust con fallback
                    cacheKey={customization?.updated_at || 'static'}
                  />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Contenido de la Pestaña Activa (Cargado con Lazy + Suspense) */}
      <div className="max-w-7xl mx-auto p-0 md:p-6">
        {/* REFACTOR (Punto 1): Añadido ErrorBoundary */}
        <ErrorBoundary fallbackMessage="Error al cargar este módulo.">
          <Suspense fallback={<ModuleLoader />}>
            {visibleTabs.map(tab => {
              const ModuleComponent = tab.component;
              const isSelected = activeTab === tab.id;
              
              // REFACTOR (Punto 4): Props tipados
              const moduleProps: Partial<ModuleProps> = {};
              if (tab.id === 'content' || tab.id === 'theme') {
                  moduleProps.onUpdate = forceAppUpdate;
              }

              return (
                <div
                  key={tab.id}
                  id={`admin-panel-${tab.id}`} // A11y
                  role="tabpanel" // A11y
                  aria-labelledby={`admin-tab-${tab.id}`} // A11y
                  hidden={!isSelected} // A11y
                  // REFACTOR (Punto 6): tabIndex para A11y
                  tabIndex={isSelected ? 0 : -1} 
                  className="outline-none"
                  data-testid={`admin-panel-${tab.id}`} // E2E
                >
                  {/* Renderizar solo el componente activo */}
                  {isSelected && <ModuleComponent {...moduleProps} />}
                </div>
              );
            })}
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}