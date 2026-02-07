/**
 * src/pages/admin-modules/SalesModule.tsx
 * "Chunk" para la pestaña de Ventas (POS y Cola de Pedidos).
 *
 * REFACTORIZADO (FASE 4):
 * 1. Botones usan clases .btn-primary, .btn-danger, .btn-icon, .btn-link
 * 2. Botones de POS (Iniciar Venta, Completar) ahora usan .btn-primary (azul)
 * en lugar del verde codificado, para seguir el tema.
 */
import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, FileText, Calendar, CheckCircle, XCircle, 
  Plus, Search, Package, ChevronLeft, ChevronRight,
  User, Globe, Receipt, QrCode
} from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { useApp } from '../App';
import { useUI } from '../components/UIContext';
import type { DailyReport, Cart, Region, Currency, Product } from '../types';

// Importar componentes genéricos (asumimos que están en /components/)
// Importar componentes genéricos
import { ResponsiveModal } from '../components/common/ResponsiveModal'; 
import { TouchButton } from '../components/common/TouchButton';
import { Input, Select } from '../components/FormControls'; 


// --- Componente Principal del Módulo ---
export default function SalesModule() {
  const { alert, confirm } = useUI();
  const [sales, setSales] = useState<DailyReport | null>(null);
  const [carts, setCarts] = useState<Cart[]>([]);
  const [showPOS, setShowPOS] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const ITEMS_PER_PAGE = 5; // Reduced for demo/testing vertical space

  const loadDailySales = () => api.getDailySales().then(setSales).catch(err => console.error(err));
  
  const loadPendingCarts = () => {
    // Fetch + 1 strategy to determine if there's a next page
    api.getPendingCarts(page * ITEMS_PER_PAGE, ITEMS_PER_PAGE + 1)
      .then(data => {
        if (data.length > ITEMS_PER_PAGE) {
          setHasMore(true);
          setCarts(data.slice(0, ITEMS_PER_PAGE));
        } else {
          setHasMore(false);
          setCarts(data);
        }
      })
      .catch(err => console.error(err));
  };
  
  const refreshAll = () => {
    loadDailySales();
    loadPendingCarts();
  };
  
  useEffect(() => {
    loadPendingCarts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); // Reload when page changes

  useEffect(() => {
    loadDailySales();
  }, []);
  
  const handleCloseDay = async () => {
    if (await confirm('¿Estás seguro de cerrar el día? Esta acción genera el reporte final y no se puede revertir.')) {
      try {
        const report = await api.closeDay();
        await alert(`✓ Día cerrado con ${report.sales_count} ventas y un total de ${report.total.toFixed(2)}`); // (report.total es 'total_with_tax')
        refreshAll();
      } catch (error: unknown) { await alert('Error cerrando el día: ' + (error as Error).message); }
    }
  };

  const handleCompleteSale = async (cart: Cart) => {
    // REFACTOR: 'amount' no es necesario, el backend usa el total del carrito.
    // 'method' -> 'payment_method'
    const paymentDetails = { payment_method: "Efectivo", reference: "CAJA-01" };
    if (!await confirm(`Cobrar (Total c/ Imp): ${cart.total_with_tax.toFixed(2)} a ${cart.customer_name}?`)) return;
    try {
      await api.completeSale(cart.id, paymentDetails);
      await alert('✓ Venta completada');
      refreshAll();
    } catch(error: unknown) { await alert('Error completando venta: ' + (error as Error).message); }
  };

  const handleCancelSale = async (cart: Cart) => {
    if (!await confirm(`¿Anular pedido de ${cart.customer_name}?`)) return;
    try {
      await api.cancelSale(cart.id);
      await alert('Pedido anulado');
      refreshAll();
    } catch(error: unknown) { await alert('Error anulando pedido: ' + (error as Error).message); }
  };
  
  return (
    <>
      {/* Modal de "Iniciar Venta" (POS) */}
      {showPOS && (
        <POSModal 
          onClose={() => setShowPOS(false)}
          onSaleComplete={() => {
            setShowPOS(false);
            refreshAll();
          }} 
        />
      )}
    
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Ventas del Día</h2>
            {sales ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="text-lg font-semibold text-blue-800">Total de Ventas (Imp. Incl.):</span>
                  <span className="text-2xl font-bold text-blue-900">Bs. {sales.total.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-600">Número de ventas: {sales.sales_count}</div>
                {/* REFACTOR FASE 4: Botón de Peligro */}
                <TouchButton 
                  onClick={handleCloseDay} 
                  variant="primary" 
                  className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm"
                  icon={Calendar}
                >
                  Cerrar Día y Generar Reporte
                </TouchButton>
              </div>
            ) : <p>Cargando ventas...</p>}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Cola de Pedidos (Web)</h2>
              {/* REFACTOR FASE 4: Botón de Icono */}
              <TouchButton 
                onClick={loadPendingCarts} 
                variant="ghost" 
                icon={RefreshCw}
              />
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {carts.length > 0 ? carts.map(cart => (
                <div key={cart.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" data-testid={`pending-cart-${cart.id}`}>
                  <div>
                    <div className="font-semibold">{cart.customer_name} <span className="text-gray-500 font-normal">({cart.customer_id})</span></div>
                    <div className="text-sm text-gray-500">Items: {cart.item_count} | Total: <span className="font-bold text-gray-800">Bs. {cart.total_with_tax.toFixed(2)}</span></div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    {/* REFACTOR FASE 4: Botones de Icono (con color) */}
                    <div className="flex gap-2">
                       <TouchButton 
                        onClick={() => handleCompleteSale(cart)} 
                        variant="ghost"
                        className="text-green-600 hover:bg-green-50 hover:text-green-700" 
                        icon={CheckCircle}
                       />
                       <TouchButton 
                        onClick={() => handleCancelSale(cart)} 
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700" 
                        icon={XCircle}
                       />
                    </div>
                  </div>
                </div>
              )) : <p className="text-gray-500 text-center py-4">No hay carritos pendientes de la web.</p>}
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <TouchButton 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                variant="secondary"
                icon={ChevronLeft}
              >
                Anterior
              </TouchButton>
              <span className="text-sm text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-lg">
                Página {page + 1}
              </span>
              <TouchButton 
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                variant="secondary"
              >
                Siguiente <ChevronRight size={16} className="ml-1 inline" />
              </TouchButton>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Punto de Venta (POS)</h2>
          {/* REFACTOR FASE 4: Botón Primario */}
          <TouchButton
            onClick={() => setShowPOS(true)}
            variant="primary"
            className="w-full text-lg h-16"
            icon={Plus}
          >
            Iniciar Venta en Tienda
          </TouchButton>
          
          <h3 className="text-xl font-bold mt-8 mb-4">Reportes</h3>
          <ul className="space-y-2">
            {/* REFACTOR FASE 4: Botones de Enlace */}
            <li><TouchButton variant="ghost" className="w-full justify-start text-left" icon={FileText}>Reporte de Ventas Mensual</TouchButton></li>
            <li><TouchButton variant="ghost" className="w-full justify-start text-left" icon={Package}>Reporte de Inventario</TouchButton></li>
            <li><TouchButton variant="ghost" className="w-full justify-start text-left" icon={Calendar}>Reporte de Cierre de Día</TouchButton></li>
          </ul>
        </div>
      </div>
    </>
  );
}


// --- Componente: Modal de "Iniciar Venta" (POS) ---
function POSModal({ onClose, onSaleComplete }: { onClose: () => void, onSaleComplete: () => void }) {
  const { alert } = useUI();
  const [regions, setRegions] = useState<Region[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [cart, setCart] = useState<Cart | null>(null); // El carrito activo del POS
  const [loading, setLoading] = useState(true);
  
  // --- Estado del formulario POS ---
  const [customerName, setCustomerName] = useState("Cliente Mostrador");
  const [customerId, setCustomerId] = useState("V-00000000");
  const [regionId, setRegionId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [recoverId, setRecoverId] = useState(""); // ID para recuperar carrito
  
  const { formatPrice, selectedCurrency } = useApp(); // Usar la moneda global seleccionada

  // Cargar datos iniciales (Regiones y Monedas)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [regs, currs] = await Promise.all([
          api.getRegions(true),
          api.getCurrencies(true)
        ]);
        setRegions(regs);
        setCurrencies(currs);
        // Setear por defecto si es posible
        if (regs.length > 0) setRegionId(regs[0].id);
        
        // Usar la moneda global si existe, si no, la base
        if (selectedCurrency) {
          setCurrencyId(selectedCurrency.id);
        } else {
          const baseCurr = currs.find(c => c.is_base);
          if (baseCurr) setCurrencyId(baseCurr.id);
          else if (currs.length > 0) setCurrencyId(currs[0].id);
        }
      } catch (e: unknown) { await alert("Error cargando datos: " + (e as Error).message); }
      setLoading(false);
    };
    loadData();
  }, [selectedCurrency]); // Depende de la moneda global

  const handleCreateCart = async () => {
    if (!regionId || !currencyId) {
      await alert("Debe seleccionar una región fiscal y una moneda.");
      return;
    }
    setLoading(true);
    try {
      const newCart = await api.createCart(customerName, customerId, regionId, currencyId);
      setCart(newCart);
    } catch (e: unknown) { await alert("Error creando carrito: " + (e as Error).message); }
    setLoading(false);
  };
  
  const handleAddItem = async (productId: string, quantity: number) => {
    if (!cart) return;
    setLoading(true);
    try {
      const updatedCart = await api.addItem(cart.id, productId, quantity);
      setCart(updatedCart); 
    } catch (e: unknown) { await alert("Error añadiendo item: " + (e as Error).message); }
    setLoading(false);
  };
  
  const handleCompleteSale = async () => {
    if (!cart) return;
    setLoading(true);
    try {
      await api.completeSale(cart.id, { payment_method: "Efectivo (POS)", reference: "CAJA-01" });
      await alert("✓ Venta de POS completada!");
      onSaleComplete(); 
    } catch (e: unknown) { await alert("Error completando venta: " + (e as Error).message); }
    setLoading(false);
  };
  


  const handleRecoverCart = async () => {
    if (!recoverId.trim()) return;
    setLoading(true);
    try {
      // Limpiar prefijos si se escanea una URL completa (aunque el QR actual es JSON)
      // Si el input es JSON (del QR), parsearlo
      let targetId = recoverId.trim();
      
      try {
        const json = JSON.parse(targetId);
        if (json.cart_id) targetId = json.cart_id;
      } catch (e) {
        // No es JSON, usar como string directo
      }

      const recoveredCart = await api.getCart(targetId);
      
      // Sincronizar estado local (opcional, pero útil si se expande la edición)
      setCustomerName(recoveredCart.customer_name);
      setCustomerId(recoveredCart.customer_id);
      
      setCart(recoveredCart);
      await alert("✓ Carrito recuperado exitosamente.");
    } catch (e: any) {
      await alert("Error recuperando carrito: " + (e.message || "ID Inválido"));
    } finally {
        setLoading(false);
    }
  };
  
  return (
    <ResponsiveModal 
      title="Punto de Venta (POS)" 
      isOpen={true} 
      onClose={onClose}
      size="xl"
      icon={<Receipt className="w-6 h-6" />}
    >
      {loading && !cart && (
        <div className="flex justify-center p-8">
            <RefreshCw className="animate-spin text-blue-600" />
        </div>
      )}
      
      {!cart ? (
        // --- VISTA 1: Crear Carrito (Configuración) ---
        <div className="space-y-6" data-testid="pos-setup-view">
          
          {/* 1. Datos del Cliente */}
          <div className="space-y-4">
             <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
               <User size={16} /> 1. Datos del Cliente
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nombre del Cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                <Input label="Cédula/RIF" value={customerId} onChange={e => setCustomerId(e.target.value)} />
             </div>
          </div>

          {/* 2. Configuración Fiscal */}
          <div className="space-y-4">
             <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
               <Globe size={16} /> 2. Configuración de Venta
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Región Fiscal" value={regionId} onChange={e => setRegionId(e.target.value)} required>
                    <option value="">Seleccione...</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
                <Select label="Moneda de Pago" value={currencyId} onChange={e => setCurrencyId(e.target.value)} required>
                    <option value="">Seleccione...</option>
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
                </Select>
             </div>
          </div>

          <div className="pt-4 border-t flex flex-col gap-4">
            <TouchButton 
                onClick={handleCreateCart}
                disabled={loading || !regionId || !currencyId || !customerName || !customerId}
                variant="primary"
                className="w-full"
                icon={Plus}
                loading={loading}
            >
                Iniciar Nuevo Carrito
            </TouchButton>

             {/* 3. Recuperar Pedido (QR) */}
             <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <QrCode size={16} /> Recuperar Pedido Web / Escanear QR
                </h3>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input 
                            placeholder="Escanee QR o ingrese ID de Carrito" 
                            value={recoverId} 
                            onChange={e => setRecoverId(e.target.value)}
                        />
                    </div>
                    <TouchButton 
                        onClick={handleRecoverCart}
                        disabled={loading || !recoverId}
                        variant="secondary"
                        icon={Search}
                        loading={loading}
                    >
                        Cargar
                    </TouchButton>
                </div>
             </div>
          </div>
        </div>
      ) : (
        // --- VISTA 2: Carrito Activo (Añadir Items) ---
        <div data-testid="pos-active-cart-view" className="flex flex-col h-full">
          <ProductSearch onProductSelect={handleAddItem} />
          
          {/* Lista de Items */}
          <div className="mt-6 flex-1 min-h-[150px] border rounded-lg overflow-hidden flex flex-col">
            <div className="bg-gray-50 p-2 font-medium border-b flex justify-between text-xs uppercase text-gray-500">
                <span>Producto</span>
                <span>Subtotal</span>
            </div>
            <div className="overflow-y-auto p-2 space-y-2">
                {cart.items.map(item => (
                <div key={item.product_id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm border">
                    <div>
                        <div className="font-medium text-sm">{item.product_name}</div>
                        <div className="text-xs text-gray-500">Cant: {item.quantity}</div>
                    </div>
                    <span className="font-bold text-gray-700">{formatPrice(item.subtotal)}</span>
                </div>
                ))}
                {cart.items.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">Carrito vacío</p>}
            </div>
          </div>
          
          {/* Totales */}
          <div className="mt-4 pt-4 border-t space-y-1 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Impuestos ({cart.tax_amount > 0 ? 'Incl.' : '0%'}):</span>
              <span>{formatPrice(cart.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-blue-700 pt-2 border-t border-gray-200 mt-1">
              <span>Total a Pagar:</span>
              <span>{formatPrice(cart.total_with_tax)}</span>
            </div>
          </div>
          
          <TouchButton
            onClick={handleCompleteSale}
            disabled={loading || cart.items.length === 0}
            variant="primary"
            className="w-full mt-4 h-14 text-lg" // Added h-14 to simulate large button
            icon={CheckCircle}
            loading={loading}
          >
            {`Cobrar ${formatPrice(cart.total_with_tax)}`}
          </TouchButton>
        </div>
      )}
    </ResponsiveModal>
  );
}

// --- Componente: Buscador de Productos (para POS) ---
function ProductSearch({ onProductSelect }: { onProductSelect: (productId: string, quantity: number) => void }) {
  const { alert } = useUI();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async () => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      setResults(await api.searchProducts(query));
    } catch (e: unknown) { await alert("Error buscando: " + (e as Error).message); }
    setLoading(false);
  };
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
            <Input 
            value={query} 
            onChange={e => setQuery(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar por SKU, Nombre..."
            data-testid="pos-product-search-input"
            />
        </div>
        <TouchButton onClick={handleSearch} disabled={loading} variant="secondary" icon={Search}>
          Buscar
        </TouchButton>
      </div>
      <div className="max-h-48 overflow-y-auto border rounded-lg bg-gray-50 border-gray-200">
        {loading && <p className="p-3 text-gray-500">Buscando...</p>}
        {!loading && results.length === 0 && query.length > 1 && <p className="p-3 text-gray-500">No se encontraron productos.</p>}
        {results.map(prod => (
          <div key={prod.id} className="flex justify-between items-center p-3 hover:bg-gray-50 border-b">
            <div>
              <div className="font-semibold">{prod.name}</div>
              <div className="text-sm text-gray-600">Stock: {prod.stock} | Precio: Bs. {prod.price.toFixed(2)}</div>
            </div>
            {/* REFACTOR FASE 4: Botón Primario (pequeño) */}
            <TouchButton
              onClick={() => onProductSelect(prod.id, 1)}
              disabled={prod.stock === 0}
              variant="primary"
              icon={Plus}
            >
              Añadir
            </TouchButton>
          </div>
        ))}
      </div>
    </div>
  );
}
