/**
 * src/pages/admin-modules/SalesModule.tsx
 * "Chunk" para la pestaña de Ventas (POS, Pedidos Web, Historial).
 *
 * REFACTORIZADO (FASE 4 - Design 15):
 * - DESIGN 15: Admin Order List (High Density)
 * - Tabs: POS | Web Orders | Sales History
 * - Premium Tables & POS Interface
 */
import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, FileText, Calendar, CheckCircle, XCircle, 
  Plus, Search, Package,
  User, Globe, Receipt, QrCode, ShoppingBag, CreditCard
} from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { useApp } from '../App';
import { useUI } from '../components/UIContext';
import { useFeedback } from '../components/ui/FeedbackModal';
import type { DailyReport, Cart, Region, Currency, Product } from '../types';

// Importar componentes genéricos
import { ResponsiveModal } from '../components/common/ResponsiveModal'; 
import { TouchButton } from '../components/common/TouchButton';
import { Input, Select } from '../components/FormControls'; 

// --- Componente Principal del Módulo ---
export default function SalesModule() {
  const { alert, confirm } = useUI();
  const { showToast } = useFeedback();
  const { formatPrice } = useApp();
  
  const [activeTab, setActiveTab] = useState<'pos' | 'web' | 'history'>('pos');
  const [salesReport, setSalesReport] = useState<DailyReport | null>(null);
  const [carts, setCarts] = useState<Cart[]>([]);
  const [showPOSModal, setShowPOSModal] = useState(false);
  
  // Pagination for Carts
  const [cartPage, setCartPage] = useState(0);
  const [hasMoreCarts, setHasMoreCarts] = useState(false);
  const CARTS_PER_PAGE = 5;

  const loadDailySales = useCallback(async () => {
    try {
        const report = await api.getDailySales();
        setSalesReport(report);
    } catch (err) {
        console.error(err);
        showToast("Error cargando reporte diario", "error");
    }
  }, [showToast]);
  
  const loadPendingCarts = useCallback(async () => {
    try {
        const data = await api.getPendingCarts(cartPage * CARTS_PER_PAGE, CARTS_PER_PAGE + 1);
        if (data.length > CARTS_PER_PAGE) {
          setHasMoreCarts(true);
          setCarts(data.slice(0, CARTS_PER_PAGE));
        } else {
          setHasMoreCarts(false);
          setCarts(data);
        }
    } catch (err) {
        console.error(err);
        showToast("Error cargando carritos", "error");
    }
  }, [cartPage, showToast]);
  
  const refreshAll = useCallback(() => {
    void loadDailySales();
    void loadPendingCarts();
  }, [loadDailySales, loadPendingCarts]);
  
  useEffect(() => {
    const fetchPending = async () => {
        await loadPendingCarts();
    };
    void fetchPending();
  }, [loadPendingCarts]);

  useEffect(() => {
    const fetchDaily = async () => {
        await loadDailySales();
    };
    void fetchDaily();
  }, [loadDailySales]);
  
  const handleCloseDay = async () => {
    if (await confirm('¿Estás seguro de cerrar el día? Esta acción genera el reporte final y no se puede revertir.')) {
      try {
        const report = await api.closeDay();
        await alert(`✓ Día cerrado con ${report.sales_count} ventas y un total de ${formatPrice(report.total)}`);
        refreshAll();
      } catch (error: unknown) { 
          showToast('Error cerrando el día: ' + (error as Error).message, 'error'); 
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Header & Tabs */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Gestión de Ventas</h2>
                <p className="text-gray-500 text-sm">Punto de venta y seguimiento de pedidos</p>
            </div>
            
            <div className="flex p-1 bg-gray-100 rounded-lg">
                <TabButton active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} icon={Receipt} label="Punto de Venta" />
                <TabButton active={activeTab === 'web'} onClick={() => setActiveTab('web')} icon={Globe} label="Pedidos Web" count={carts.length} />
                <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={FileText} label="Historial" />
            </div>
       </div>

       {/* Content Area */}
       <div className="min-h-[400px]">
            {activeTab === 'pos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="bg-linear-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-blue-100 font-medium mb-1">Ventas Totales (Hoy)</h3>
                            <div className="text-4xl font-bold mb-4">{salesReport ? formatPrice(salesReport.total) : '...'}</div>
                            <div className="inline-flex items-center gap-2 bg-blue-500/30 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                                <ShoppingBag size={14} /> {salesReport?.sales_count || 0} transacciones
                            </div>
                        </div>
                        <div className="mt-8 relative z-10">
                            <TouchButton
                                onClick={() => setShowPOSModal(true)}
                                variant="primary"
                                className="w-full bg-white text-blue-700 hover:bg-blue-50 border-none shadow-lg h-14 text-lg font-bold"
                                icon={Plus}
                            >
                                Nueva Venta (POS)
                            </TouchButton>
                        </div>
                        {/* Decorative Circles */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl pointer-events-none" />
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Calendar size={18} className="text-gray-400" /> Acciones de Caja
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                             <ActionButton icon={FileText} label="Reporte Z" onClick={() => {}} />
                             <ActionButton icon={Package} label="Inventario" onClick={() => {}} />
                        </div>
                         <TouchButton 
                            onClick={handleCloseDay} 
                            variant="secondary" 
                            className="w-full mt-4 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200"
                            icon={XCircle}
                          >
                            Cerrar Operaciones del Día
                          </TouchButton>
                    </div>
                </div>
            )}

            {activeTab === 'web' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800">Cola de Pedidos Pendientes</h3>
                        <button onClick={loadPendingCarts} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"><RefreshCw size={18} /></button>
                    </div>
                    {carts.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <ShoppingBag size={48} className="mx-auto mb-3 opacity-20" />
                            <p>No hay pedidos web pendientes</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                             {carts.map(cart => (
                                 <WebOrderRow 
                                    key={cart.id} 
                                    cart={cart} 
                                    onComplete={() => {
                                        refreshAll();
                                        showToast("Pedido completado", "success");
                                    }}
                                    onCancel={() => {
                                        refreshAll();
                                        showToast("Pedido anulado", "info");
                                    }}
                                 />
                             ))}
                        </div>
                    )}
                     <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-center">
                        {/* Simple Pagination */}
                        <div className="flex gap-2">
                            <button disabled={cartPage === 0} onClick={() => setCartPage(p => p - 1)} className="px-3 py-1 rounded border bg-white disabled:opacity-50">Prev</button>
                            <button disabled={!hasMoreCarts} onClick={() => setCartPage(p => p + 1)} className="px-3 py-1 rounded border bg-white disabled:opacity-50">Next</button>
                        </div>
                     </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-gray-800">Transacciones de Hoy</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3">ID Venta</th>
                                    <th className="px-6 py-3">Hora</th>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3">Método</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                    <th className="px-6 py-3 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {salesReport?.sales?.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-3 font-mono text-xs text-gray-400">#{sale.id.slice(0, 8)}</td>
                                        <td className="px-6 py-3 text-gray-600">
                                            {new Date(sale.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-900">{sale.customer_name}</td>
                                        <td className="px-6 py-3 text-gray-600 flex items-center gap-2">
                                            <CreditCard size={14} />
                                            {sale.payment_details?.payment_method || 'N/A'}
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-green-600">
                                            {formatPrice(sale.total_with_tax)}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                Completado
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(!salesReport?.sales || salesReport.sales.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                            No hay ventas registradas hoy
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
       </div>

       {/* POS MODAL */}
       {showPOSModal && (
         <POSModal 
           onClose={() => setShowPOSModal(false)}
           onSaleComplete={() => {
             setShowPOSModal(false);
             refreshAll();
           }} 
         />
       )}
    </div>
  );
}

// --- Sub-components ---

const TabButton = ({ active, onClick, icon: Icon, label, count }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
        }`}
    >
        <Icon size={16} />
        {label}
        {count !== undefined && count > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                {count}
            </span>
        )}
    </button>
);

const ActionButton = ({ icon: Icon, label, onClick }: any) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
         <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:bg-blue-100 group-hover:scale-110 transition-transform">
             <Icon size={20} />
         </div>
         <span className="text-xs font-bold text-gray-700">{label}</span>
    </button>
);

const WebOrderRow = ({ cart, onComplete, onCancel }: { cart: Cart, onComplete: () => void, onCancel: () => void }) => {
    const { formatPrice } = useApp();
    const { confirm } = useUI();

    const handleComplete = async () => {
        if (await confirm(`¿Cobrar ${formatPrice(cart.total_with_tax)} a ${cart.customer_name}?`, "Confirmar Venta Web")) {
            try {
                await api.completeSale(cart.id, { payment_method: "Efectivo", reference: "WEB" });
                onComplete();
            } catch (e) { console.error(e); }
        }
    }

    const handleCancel = async () => {
        if (await confirm(`¿Anular pedido de ${cart.customer_name}?`, "Anular Pedido")) {
            try {
                await api.cancelSale(cart.id);
                onCancel();
            } catch (e) { console.error(e); }
        }
    }

    return (
        <div className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-center gap-4 group">
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold">
                    {cart.customer_name.charAt(0)}
                </div>
                <div>
                     <div className="font-bold text-gray-900">{cart.customer_name}</div>
                     <div className="text-xs text-gray-500 font-mono">ID: {cart.id.slice(0, 8)} • {cart.item_count} items</div>
                </div>
            </div>
            
            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                    <div className="font-bold text-lg text-gray-900 leading-none">{formatPrice(cart.total_with_tax)}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">Total</div>
                </div>
                
                <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={handleComplete} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Completar">
                        <CheckCircle size={20} />
                    </button>
                    <button onClick={handleCancel} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Anular">
                        <XCircle size={20} />
                    </button>
                </div>
            </div>
        </div>
    )
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
        if (regs.length > 0) setRegionId(regs[0].id);
        
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
  }, [selectedCurrency, alert]); 

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
      let targetId = recoverId.trim();
      try {
        const json = JSON.parse(targetId);
        if (json.cart_id) targetId = json.cart_id;
      } catch (e) { /* silent */ }

      const recoveredCart = await api.getCart(targetId);
      setCustomerName(recoveredCart.customer_name);
      setCustomerId(recoveredCart.customer_id);
      setCart(recoveredCart);
      await alert("✓ Carrito recuperado exitosamente.");
    } catch (e: unknown) {
      await alert("Error recuperando carrito: " + ((e as Error).message || "ID Inválido"));
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
        <div className="flex justify-center p-12">
            <RefreshCw className="animate-spin text-blue-600" size={32} />
        </div>
      )}
      
      {!cart ? (
        <div className="space-y-6 animate-fade-in" data-testid="pos-setup-view">
          {/* Setup Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><User size={16} /> Cliente</h3>
                  <Input label="Nombre" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                  <Input label="ID / RIF" value={customerId} onChange={e => setCustomerId(e.target.value)} />
              </div>
              <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><Globe size={16} /> Fiscal</h3>
                  <Select label="Región" value={regionId} onChange={e => setRegionId(e.target.value)} required>
                      <option value="">Seleccione...</option>
                      {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </Select>
                  <Select label="Moneda" value={currencyId} onChange={e => setCurrencyId(e.target.value)} required>
                      <option value="">Seleccione...</option>
                      {currencies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
                  </Select>
              </div>
          </div>
          
          <TouchButton 
              onClick={handleCreateCart}
              disabled={loading || !regionId || !currencyId || !customerName || !customerId}
              variant="primary"
              className="w-full h-12 text-lg font-bold shadow-lg shadow-blue-500/20"
              icon={Plus}
              loading={loading}
          >
              Iniciar Venta
          </TouchButton>

          <div className="relative border-t border-gray-200 pt-6">
               <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-400 font-bold uppercase tracking-widest">O recuperar</span>
               <div className="flex gap-2">
                    <Input 
                        placeholder="ID de Pedido o QR JSON..." 
                        value={recoverId} 
                        onChange={e => setRecoverId(e.target.value)}
                        className="flex-1"
                    />
                    <TouchButton onClick={handleRecoverCart} disabled={loading || !recoverId} variant="secondary" icon={QrCode}>
                       Cargar
                    </TouchButton>
               </div>
          </div>
        </div>
      ) : (
        <div data-testid="pos-active-cart-view" className="flex flex-col h-full animate-fade-in">
          <ProductSearch onProductSelect={handleAddItem} />
          
          <div className="mt-4 flex-1 min-h-[200px] border border-gray-200 rounded-xl overflow-hidden flex flex-col bg-gray-50/30">
            <div className="bg-gray-100/50 p-3 text-xs font-bold text-gray-500 uppercase flex justify-between tracking-wider">
                <span>Producto</span>
                <span>Subtotal</span>
            </div>
            <div className="overflow-y-auto p-2 space-y-2 flex-1">
                {cart.items.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <ShoppingBag size={32} className="mb-2 opacity-20" />
                        <p>Carrito vacío</p>
                    </div>
                )}
                {cart.items.map(item => (
                <div key={item.product_id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                    <div>
                        <div className="font-bold text-gray-800">{item.product_name}</div>
                        <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                    </div>
                    <span className="font-mono font-bold text-gray-900">{formatPrice(item.subtotal)}</span>
                </div>
                ))}
            </div>
            
            <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">{formatPrice(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-500">Impuestos</span>
                    <span className="font-medium text-red-500">+{formatPrice(cart.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-2xl font-black text-gray-900 mb-4">
                    <span>Total</span>
                    <span>{formatPrice(cart.total_with_tax)}</span>
                </div>
                <TouchButton
                    onClick={handleCompleteSale}
                    disabled={loading || cart.items.length === 0}
                    variant="primary"
                    className="w-full h-14 text-xl font-bold shadow-xl shadow-blue-600/20"
                    icon={CheckCircle}
                    loading={loading}
                >
                    Cobrar
                </TouchButton>
            </div>
          </div>
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
    } catch (_e: unknown) { await alert("Error buscando: " + (_e as Error).message); }
    setLoading(false);
  };
  
  return (
    <div className="space-y-2 relative">
      <div className="flex gap-2">
        <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
                value={query} 
                onChange={e => setQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar producto..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
            />
        </div>
        <TouchButton onClick={handleSearch} disabled={loading} variant="secondary" icon={Search} iconOnly className="aspect-square" />
      </div>
      
      {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100 z-50 divide-y divide-gray-50">
            {results.map(prod => (
            <div key={prod.id} className="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => prod.stock > 0 && onProductSelect(prod.id, 1)}>
                <div>
                <div className="font-bold text-sm text-gray-800">{prod.name}</div>
                <div className="text-xs text-gray-500">Stock: {prod.stock} • Bs. {prod.price.toFixed(2)}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Plus size={16} />
                </div>
            </div>
            ))}
          </div>
      )}
    </div>
  );
}
