/**
 * src/pages/admin-modules/SalesModule.tsx
 * "Chunk" para la pestaña de Ventas (POS y Cola de Pedidos).
 *
 * REFACTORIZADO (FASE 4):
 * 1. Botones usan clases .btn-primary, .btn-danger, .btn-icon, .btn-link
 * 2. Botones de POS (Iniciar Venta, Completar) ahora usan .btn-primary (azul)
 * en lugar del verde codificado, para seguir el tema.
 */
import { useState, useEffect } from 'react';
import { 
  RefreshCw, FileText, Calendar, CheckCircle, XCircle, 
  Plus, Search, Package, ChevronLeft, ChevronRight
} from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { useApp } from '../App';
import type { DailyReport, Cart, Region, Currency, Product } from '../types';

// Importar componentes genéricos (asumimos que están en /components/)
import { Modal } from '../components/Modal'; 
import { Input, Select } from '../components/FormControls'; 


// --- Componente Principal del Módulo ---
export default function SalesModule() {
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
    if (confirm('¿Estás seguro de cerrar el día? Esta acción genera el reporte final y no se puede revertir.')) {
      try {
        const report = await api.closeDay();
        alert(`✓ Día cerrado con ${report.sales_count} ventas y un total de ${report.total.toFixed(2)}`); // (report.total es 'total_with_tax')
        refreshAll();
      } catch (error: unknown) { alert('Error cerrando el día: ' + (error as Error).message); }
    }
  };

  const handleCompleteSale = async (cart: Cart) => {
    // REFACTOR: 'amount' no es necesario, el backend usa el total del carrito.
    // 'method' -> 'payment_method'
    const paymentDetails = { payment_method: "Efectivo", reference: "CAJA-01" };
    if (!confirm(`Cobrar (Total c/ Imp): ${cart.total_with_tax.toFixed(2)} a ${cart.customer_name}?`)) return;
    try {
      await api.completeSale(cart.id, paymentDetails);
      alert('✓ Venta completada');
      refreshAll();
    } catch(error: unknown) { alert('Error completando venta: ' + (error as Error).message); }
  };

  const handleCancelSale = async (cart: Cart) => {
    if (!confirm(`¿Anular pedido de ${cart.customer_name}?`)) return;
    try {
      await api.cancelSale(cart.id);
      alert('Pedido anulado');
      refreshAll();
    } catch(error: unknown) { alert('Error anulando pedido: ' + (error as Error).message); }
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
                <button data-testid="close-day-button" onClick={handleCloseDay} className="btn-danger w-full">
                  <Calendar size={18} />
                  Cerrar Día y Generar Reporte
                </button>
              </div>
            ) : <p>Cargando ventas...</p>}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Cola de Pedidos (Web)</h2>
              {/* REFACTOR FASE 4: Botón de Icono */}
              <button onClick={loadPendingCarts} className="btn-icon text-blue-600" title="Refrescar">
                <RefreshCw size={18} />
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {carts.length > 0 ? carts.map(cart => (
                <div key={cart.id} className="p-4 border rounded-lg flex justify-between items-center" data-testid={`pending-cart-${cart.id}`}>
                  <div>
                    <div className="font-semibold">{cart.customer_name} <span className="text-gray-500 font-normal">({cart.customer_id})</span></div>
                    <div className="text-sm text-gray-500">Items: {cart.item_count} | Total: <span className="font-bold text-gray-800">Bs. {cart.total_with_tax.toFixed(2)}</span></div>
                  </div>
                  <div className="flex gap-2">
                    {/* REFACTOR FASE 4: Botones de Icono (con color) */}
                    <button 
                      onClick={() => handleCompleteSale(cart)} 
                      className="btn-icon text-green-600 hover:bg-green-50" 
                      title="Marcar como Completada"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button 
                      onClick={() => handleCancelSale(cart)} 
                      className="btn-icon text-red-600 hover:bg-red-50" 
                      title="Anular Pedido"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>
              )) : <p className="text-gray-500 text-center py-4">No hay carritos pendientes de la web.</p>}
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <button 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-secondary disabled:opacity-50"
              >
                <ChevronLeft size={16} className="mr-1" /> Anterior
              </button>
              <span className="text-sm text-gray-600">Página {page + 1}</span>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                className="btn-secondary disabled:opacity-50"
              >
                Siguiente <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Punto de Venta (POS)</h2>
          {/* REFACTOR FASE 4: Botón Primario */}
          <button
            data-testid="pos-start-button"
            onClick={() => setShowPOS(true)}
            className="btn-primary w-full text-lg"
          >
            <Plus size={20} />
            Iniciar Venta en Tienda
          </button>
          
          <h3 className="text-xl font-bold mt-8 mb-4">Reportes</h3>
          <ul className="space-y-2">
            {/* REFACTOR FASE 4: Botones de Enlace */}
            <li><button className="btn-link"><FileText size={18} /> Reporte de Ventas Mensual</button></li>
            <li><button className="btn-link"><Package size={18} /> Reporte de Inventario</button></li>
            <li><button className="btn-link"><Calendar size={18} /> Reporte de Cierre de Día</button></li>
          </ul>
        </div>
      </div>
    </>
  );
}


// --- Componente: Modal de "Iniciar Venta" (POS) ---
function POSModal({ onClose, onSaleComplete }: { onClose: () => void, onSaleComplete: () => void }) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [cart, setCart] = useState<Cart | null>(null); // El carrito activo del POS
  const [loading, setLoading] = useState(true);
  
  // --- Estado del formulario POS ---
  const [customerName, setCustomerName] = useState("Cliente Mostrador");
  const [customerId, setCustomerId] = useState("V-00000000");
  const [regionId, setRegionId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  
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
      } catch (e: unknown) { alert("Error cargando datos: " + (e as Error).message); }
      setLoading(false);
    };
    loadData();
  }, [selectedCurrency]); // Depende de la moneda global

  const handleCreateCart = async () => {
    if (!regionId || !currencyId) {
      alert("Debe seleccionar una región fiscal y una moneda.");
      return;
    }
    setLoading(true);
    try {
      const newCart = await api.createCart(customerName, customerId, regionId, currencyId);
      setCart(newCart);
    } catch (e: unknown) { alert("Error creando carrito: " + (e as Error).message); }
    setLoading(false);
  };
  
  const handleAddItem = async (productId: string, quantity: number) => {
    if (!cart) return;
    setLoading(true);
    try {
      const updatedCart = await api.addItem(cart.id, productId, quantity);
      setCart(updatedCart); 
    } catch (e: unknown) { alert("Error añadiendo item: " + (e as Error).message); }
    setLoading(false);
  };
  
  const handleCompleteSale = async () => {
    if (!cart) return;
    setLoading(true);
    try {
      await api.completeSale(cart.id, { payment_method: "Efectivo (POS)", reference: "CAJA-01" });
      alert("✓ Venta de POS completada!");
      onSaleComplete(); 
    } catch (e: unknown) { alert("Error completando venta: " + (e as Error).message); }
    setLoading(false);
  };
  
  return (
    <Modal title="Punto de Venta (POS)" isOpen={true} onClose={onClose}>
      {loading && !cart && <p>Cargando configuración...</p>}
      
      {!cart ? (
        // --- VISTA 1: Crear Carrito (Configuración) ---
        <div className="space-y-4" data-testid="pos-setup-view">
          <Input label="Nombre del Cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <Input label="Cédula/RIF del Cliente" value={customerId} onChange={e => setCustomerId(e.target.value)} />
          
          <Select label="Región Fiscal (Para Impuestos)" value={regionId} onChange={e => setRegionId(e.target.value)} required>
            <option value="">Seleccione una Región...</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <Select label="Moneda de Pago" value={currencyId} onChange={e => setCurrencyId(e.target.value)} required>
            <option value="">Seleccione una Moneda...</option>
            {currencies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
          </Select>

          {/* REFACTOR FASE 4: Botón Primario */}
          <button 
            data-testid="pos-create-cart-button"
            onClick={handleCreateCart}
            disabled={loading || !regionId || !currencyId || !customerName || !customerId}
            className="btn-primary w-full"
          >
            Iniciar Carrito
          </button>
        </div>
      ) : (
        // --- VISTA 2: Carrito Activo (Añadir Items) ---
        <div data-testid="pos-active-cart-view">
          <ProductSearch onProductSelect={handleAddItem} />
          
          {/* Lista de Items */}
          <div className="mt-6 space-y-2 max-h-48 overflow-y-auto">
            {cart.items.map(item => (
              <div key={item.product_id} className="flex justify-between border-b pb-2">
                <span>{item.product_name} (x{item.quantity})</span>
                <span className="font-medium">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
          </div>
          
          {/* Totales (Impuestos calculados por el backend) */}
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between font-semibold">
              <span>Subtotal:</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Impuestos:</span>
              <span>{formatPrice(cart.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold text-blue-600">
              <span>Total:</span>
              <span>{formatPrice(cart.total_with_tax)}</span>
            </div>
          </div>
          
          {/* REFACTOR FASE 4: Botón Primario */}
          <button
            data-testid="pos-complete-sale-button"
            onClick={handleCompleteSale}
            disabled={loading || cart.items.length === 0}
            className="btn-primary w-full mt-6"
          >
            {loading ? 'Procesando...' : `Completar Venta (${formatPrice(cart.total_with_tax)})`}
          </button>
        </div>
      )}
    </Modal>
  );
}

// --- Componente: Buscador de Productos (para POS) ---
function ProductSearch({ onProductSelect }: { onProductSelect: (productId: string, quantity: number) => void }) {
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
    } catch (e: unknown) { alert("Error buscando: " + (e as Error).message); }
    setLoading(false);
  };
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input 
          value={query} 
          onChange={e => setQuery(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar por SKU, Nombre..."
          data-testid="pos-product-search-input"
        />
        {/* REFACTOR FASE 4: Botón Secundario */}
        <button onClick={handleSearch} disabled={loading} className="btn-secondary">
          <Search size={20} />
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto border rounded-lg">
        {loading && <p className="p-3 text-gray-500">Buscando...</p>}
        {!loading && results.length === 0 && query.length > 1 && <p className="p-3 text-gray-500">No se encontraron productos.</p>}
        {results.map(prod => (
          <div key={prod.id} className="flex justify-between items-center p-3 hover:bg-gray-50 border-b">
            <div>
              <div className="font-semibold">{prod.name}</div>
              <div className="text-sm text-gray-600">Stock: {prod.stock} | Precio: Bs. {prod.price.toFixed(2)}</div>
            </div>
            {/* REFACTOR FASE 4: Botón Primario (pequeño) */}
            <button
              onClick={() => onProductSelect(prod.id, 1)}
              disabled={prod.stock === 0}
              className="btn-primary text-sm py-1! px-3!"
              data-testid={`pos-add-item-${prod.id}`}
            >
              Añadir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}