/**
 * src/pages/admin-modules/FinanceModule.tsx
 * "Chunk" para la pestaña de Gestión de Monedas (Lógica de Negocio).
 * REFACTORIZADO (FASE 4):
 * 1. Botones usan clases .btn-primary, .btn-secondary, .btn-link
 */
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { Currency } from '../types';
import { useUI } from '../components/UIContext';

interface CurrencyFormData {
  name: string;
  symbol: string;
  is_base: boolean;
  exchange_rate: number;
  tax_rate: number;
}

// Importar componentes reutilizables
import { ResponsiveModal } from '../components/common/ResponsiveModal';
import { Input, Checkbox } from '../components/FormControls';
import { TouchButton } from '../components/common/TouchButton';

// --- Componente Principal del Módulo ---
export default function FinanceModule() {
  const { alert, confirm, prompt } = useUI();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const loadCurrencies = useCallback(async () => {
    try {
      setLoading(true);
      setCurrencies(await api.getCurrencies());
    } catch (e: any) { await alert("Error cargando monedas: " + e.message); }
    finally { setLoading(false); }
  }, [alert]);
  
  useEffect(() => {
    void loadCurrencies();
  }, [loadCurrencies]);
  
  const handleSave = async (data: any) => {
    try {
      const payload = {
        name: data.name,
        symbol: data.symbol,
        is_base: data.is_base,
        exchange_rate: parseFloat(data.exchange_rate),
      };
      await api.createCurrency(payload);
      await alert('✓ Moneda creada');
      loadCurrencies();
      setShowForm(false);
    } catch (error: any) {
      await alert('Error creando moneda: ' + error.message);
    }
  };
  
  const handleUpdateRate = async (id: string, name: string, isBase: boolean) => {
    if (isBase) {
      await alert("No se puede cambiar la tasa de la moneda base (es 1.0 por definición).");
      return;
    }
    const newRate = await prompt(`Nueva tasa de cambio para ${name}:\n(Cuántas unidades de la Moneda Base cuestan 1 unidad de esta moneda)`);
    if (newRate && !isNaN(parseFloat(newRate))) {
      try {
        await api.updateCurrencyRate(id, parseFloat(newRate));
        loadCurrencies();
      } catch (error: any) {
        await alert('Error actualizando tasa: ' + error.message);
      }
    }
  };

  const handleUpdateTaxRate = async (id: string, name: string) => {
    const newRate = await prompt(`Nueva tasa de impuesto (IGTF) para ${name} (en decimal, ej. 0.03 para 3%):`);
    if (newRate && !isNaN(parseFloat(newRate))) {
      try {
        await api.updateCurrencyTaxRate(id, parseFloat(newRate));
        loadCurrencies();
      } catch (error: any) {
        await alert('Error actualizando IGTF: ' + error.message);
      }
    }
  };

  const handleSetBase = async (id: string, name: string) => {
    if (await confirm(`¿Está seguro de establecer ${name} como la nueva moneda base?\n\n¡ADVERTENCIA! Esta acción recalculará TODAS las demás tasas de cambio en relación a esta.`)) {
      try {
        await api.setBaseCurrency(id);
        await alert(`✓ ${name} es ahora la nueva moneda base.`);
        loadCurrencies();
      } catch (error: any) {
        await alert('Error estableciendo moneda base: ' + error.message);
      }
    }
  };
  
  const handleDelete = async (id: string, name: string, isBase: boolean) => {
    if (isBase) {
      await alert("No se puede eliminar la moneda base. Primero debe asignar otra moneda como base.");
      return;
    }
    if (await confirm(`¿Desactivar moneda "${name}"? (No se puede deshacer)`)) {
      try {
        await api.deleteCurrency(id);
        loadCurrencies();
      } catch (error: any) {
        await alert('Error eliminando moneda: ' + error.message);
      }
    }
  };
  
  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Monedas</h2>
        {/* REFACTOR FASE 4: Botón Primario */}
        <TouchButton 
          onClick={() => setShowForm(true)} 
          variant="primary"
          icon={Plus}
          data-testid="finance-add-currency-btn"
        >
          Nueva Moneda
        </TouchButton>
      </div>
      
      {showForm && (
        <ResponsiveModal title="Nueva Moneda" isOpen={showForm} onClose={() => setShowForm(false)} size="md" icon={<Plus className="w-6 h-6" />}>
          <CurrencyForm onSave={handleSave} onCancel={() => setShowForm(false)} currencies={currencies} />
        </ResponsiveModal>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left text-xs font-semibold uppercase text-gray-600">Nombre</th>
              <th className="p-3 text-left text-xs font-semibold uppercase text-gray-600">Tasa (1 [Moneda] = X [Base])</th>
              <th className="p-3 text-left text-xs font-semibold uppercase text-gray-600">IGTF (%)</th>
              <th className="p-3 text-center text-xs font-semibold uppercase text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={4} className="text-center p-8 text-gray-500">Cargando monedas...</td></tr>
            ) : (
              currencies.map(c => (
                <tr key={c.id} className="hover:bg-gray-50" data-testid={`currency-row-${c.id}`}>
                  <td className="p-3">
                    <div className="font-semibold">{c.name} ({c.symbol})</div>
                    {c.is_base && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">BASE</span>}
                  </td>
                  <td className="p-3">{c.exchange_rate.toFixed(4)}</td>
                  <td className="p-3">{(c.tax_rate * 100).toFixed(2)}%</td>
                  <td className="p-3 text-center space-x-2 whitespace-nowrap">
                    {/* REFACTOR FASE 4: Botones de Enlace */}
                    <TouchButton 
                      onClick={() => handleUpdateRate(c.id, c.name, c.is_base)} 
                      variant="ghost" 
                      className="text-blue-600 disabled:text-gray-400" 
                      disabled={c.is_base}
                      data-testid={`update-rate-btn-${c.id}`}
                    >
                      Tasa
                    </TouchButton>
                    <TouchButton 
                      onClick={() => handleUpdateTaxRate(c.id, c.name)} 
                      variant="ghost" 
                      className="text-blue-600" 
                      data-testid={`update-tax-btn-${c.id}`}
                    >
                      Tax
                    </TouchButton>
                    <TouchButton 
                      onClick={() => handleSetBase(c.id, c.name)} 
                      variant="ghost" 
                      className="text-green-600 disabled:text-gray-400" 
                      disabled={c.is_base}
                      data-testid={`set-base-btn-${c.id}`}
                    >
                      Hacer Base
                    </TouchButton>
                    <TouchButton 
                      onClick={() => handleDelete(c.id, c.name, c.is_base)} 
                      variant="ghost" 
                      className="text-red-600 disabled:text-gray-400" 
                      disabled={c.is_base}
                      data-testid={`delete-currency-btn-${c.id}`}
                    >
                      Desactivar
                    </TouchButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// --- Componente: Formulario de Moneda (Interno) ---
function CurrencyForm({ onSave, onCancel, currencies }: { onSave: (data: CurrencyFormData) => void, onCancel: () => void, currencies: Currency[] }) {
  const { alert } = useUI();
  const [data, setData] = useState<CurrencyFormData>({ name: '', symbol: '', is_base: false, exchange_rate: 1.0, tax_rate: 0.0 });
  const baseCurrency = currencies.find(c => c.is_base);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (data.is_base && baseCurrency) {
      await alert(`Error: Ya existe una moneda base (${baseCurrency.name}).`);
      return;
    }
    onSave(data);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Nombre (ej. Dólares)" value={data.name} onChange={(e) => setData({...data, name: e.target.value})} required data-testid="currency-name-input" />
      <Input label="Símbolo (ej. $)" value={data.symbol} onChange={(e) => setData({...data, symbol: e.target.value})} required data-testid="currency-symbol-input" />
      <Checkbox 
        label="Es Moneda Base" 
        checked={data.is_base} 
        onChange={(e) => setData({...data, is_base: e.target.checked, exchange_rate: 1.0})} 
        disabled={!!baseCurrency}
        data-testid="currency-isbase-check"
      />
      
      <Input 
        label="IGTF (0.03 = 3%)" 
        type="number" 
        step="0.01" 
        value={data.tax_rate} 
        onChange={(e) => setData({...data, tax_rate: parseFloat(e.target.value) || 0})} 
        data-testid="currency-tax-input"
      />

      {!data.is_base && (
        <Input 
          label={`Tasa (1 ${baseCurrency?.symbol || 'BASE'} = X ${data.symbol || 'MONEDA'})`} 
          type="number" 
          step="0.0001" 
          value={data.exchange_rate} 
          onChange={(e) => setData({...data, exchange_rate: parseFloat(e.target.value) || 0})} 
          required 
          data-testid="currency-rate-input"
        />
      )}
      {/* REFACTOR FASE 4: Botón Primario y Secundario */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t mt-4">
        <TouchButton type="button" onClick={onCancel} variant="secondary" className="flex-1 sm:flex-none">Cancelar</TouchButton>
        <TouchButton type="submit" variant="primary" className="flex-1" data-testid="currency-save-button">Guardar</TouchButton>
      </div>
    </form>
  );
}