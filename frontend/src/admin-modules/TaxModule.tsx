/**
 * src/pages/admin-modules/TaxModule.tsx
 * "Chunk" para la pestaña de Gestión de Impuestos (Lógica Regional).
 * REFACTORIZADO (FASE 4):
 * 1. Botones usan clases .btn-primary, .btn-secondary, .btn-icon
 * 2. Botón "Nueva Tasa" ahora usa .btn-primary (azul) en lugar
 * del verde codificado.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { useUI } from '../components/UIContext';
import type { Region, TaxRate } from '../../types';

// Importar componentes reutilizables
import { Modal } from '../components/Modal';
import { Input, Select, Checkbox } from '../components/FormControls'; // Importar Checkbox
import { TouchButton } from '../components/common/TouchButton';

// --- Componente Principal del Módulo ---
export default function TaxModule() {
  const { alert } = useUI();
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);

  const loadRegions = useCallback(async () => {
    try {
      setLoading(true);
      setRegions(await api.getRegions(false)); // Cargar todas (activas e inactivas)
    } catch (e: any) { await alert("Error cargando regiones: " + e.message); }
    finally { setLoading(false); }
  }, [alert]);

  useEffect(() => { void loadRegions(); }, [loadRegions]);

  useEffect(() => {
    if (selectedRegion) {
      const loadRates = async () => {
        try {
            setLoading(true);
            const rates = await api.getTaxRatesForRegion(selectedRegion.id);
            setTaxRates(rates);
        } catch (e: any) {
            await alert("Error cargando tasas: " + e.message);
        } finally {
            setLoading(false);
        }
      };
      void loadRates();
    } else {
      setTaxRates([]);
    }
  }, [selectedRegion, alert]); // Recargar tasas cuando la región cambia

  const handleRegionSave = async (data: Partial<Region>) => {
    try {
      if (editingRegion) {
        // Actualizar
        await api.updateRegion(editingRegion.id, data);
        await alert("✓ Región actualizada");
      } else {
        // Crear
        await api.createRegion(data);
        await alert("✓ Región creada");
      }
      setShowRegionForm(false);
      setEditingRegion(null);
      loadRegions();
    } catch (e: any) { await alert("Error: " + e.message); }
  };
  
  const handleRateSave = async (data: any) => {
    if (!selectedRegion) return;
    try {
      await api.createTaxRate({
        name: data.name,
        region_id: selectedRegion.id,
        rate: parseFloat(data.rate),
        priority: parseInt(data.priority) || 1
      });
      await alert("✓ Tasa creada");
      setShowRateForm(false);
      // Refrescar tasas
      api.getTaxRatesForRegion(selectedRegion.id).then(setTaxRates);
    } catch (e: any) { await alert("Error: " + e.message); }
  };

  const totalTaxRate = useMemo(() => {
    // Suma las tasas (ej. 0.06 + 0.02 = 0.08)
    return taxRates.reduce((sum, r) => sum + r.rate, 0);
  }, [taxRates]);

  return (
    <>
      {/* Formulario Modal para Regiones */}
      {showRegionForm && (
        <Modal 
          title={editingRegion ? "Editar Región" : "Nueva Región Fiscal"} 
          isOpen={showRegionForm} 
          onClose={() => { setShowRegionForm(false); setEditingRegion(null); }}
          size="md"
        >
          <RegionForm 
            region={editingRegion} 
            onSave={handleRegionSave} 
            onCancel={() => { setShowRegionForm(false); setEditingRegion(null); }} 
          />
        </Modal>
      )}
      
      {/* Formulario Modal para Tasas */}
      {showRateForm && selectedRegion && (
        <Modal 
          title={`Nueva Tasa para ${selectedRegion.name}`} 
          isOpen={showRateForm} 
          onClose={() => setShowRateForm(false)}
          size="md"
        >
          <TaxRateForm 
            onSave={handleRateSave} 
            onCancel={() => setShowRateForm(false)} 
          />
        </Modal>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Regiones Fiscales</h2>
          {/* REFACTOR FASE 4: Botón Primario */}
          <TouchButton
            onClick={() => { setEditingRegion(null); setShowRegionForm(true); }}
            variant="primary"
            icon={Plus}
            className="w-full mb-4"
            data-testid="tax-add-region-btn"
          >
            Nueva Región
          </TouchButton>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading && <p>Cargando...</p>}
            {regions.map(region => (
              <button
                key={region.id}
                data-testid={`region-button-${region.id}`}
                onClick={() => setSelectedRegion(region)}
                className={`w-full text-left p-3 rounded-lg flex justify-between items-center ${!region.is_active ? 'text-gray-400 line-through' : ''} ${selectedRegion?.id === region.id ? 'bg-blue-100 text-blue-800 font-semibold' : 'hover:bg-gray-100'}`}
              >
                <span>{region.name}</span>
                {/* REFACTOR FASE 4: Botón de Icono */}
                <span 
                  className="btn-icon text-gray-400 hover:text-blue-600"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setEditingRegion(region); 
                    setShowRegionForm(true); 
                  }}
                >
                  <Edit2 size={16} />
                </span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">
            Tasas de Impuesto {selectedRegion ? `para "${selectedRegion.name}"` : ''}
          </h2>
          {selectedRegion ? (
            <>
              {/* REFACTOR FASE 4: Botón Primario */}
              <TouchButton
                onClick={() => setShowRateForm(true)}
                data-testid="taxrate-add-button"
                variant="primary"
                icon={Plus}
                className="w-full mb-4"
              >
                Nueva Tasa para esta Región
              </TouchButton>
              <div className="space-y-2">
                {loading && <p>Cargando tasas...</p>}
                {taxRates.map(rate => (
                  <div key={rate.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="font-semibold">{rate.name}</span>
                    <span className="text-lg font-bold text-blue-600">{(rate.rate * 100).toFixed(2)}%</span>
                  </div>
                ))}
                {taxRates.length === 0 && <p className="text-gray-500">No hay tasas para esta región.</p>}
                
                {/* Lógica de "Filadelfia 6% + 2%" */}
                <div className="flex justify-between items-center p-3 border-t-2 mt-4">
                  <span className="font-bold text-xl">TOTAL IMPUESTO:</span>
                  <span className="text-xl font-bold text-blue-800" data-testid="tax-total-rate">
                    {(totalTaxRate * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-10">Seleccione una región para ver/añadir sus tasas.</p>
          )}
        </div>
      </div>
    </>
  );
}

// --- Componente: Formulario de Región (Interno) ---
function RegionForm({ region, onSave, onCancel }: { region: Region | null, onSave: (data: Partial<Region>) => void, onCancel: () => void }) {
  const [data, setData] = useState<Partial<Region>>(region || { name: '', country: '', state: '', city: '', zip_code: '', is_active: true });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(data);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Nombre de la Región" value={data.name} onChange={(e) => setData({...data, name: e.target.value})} required data-testid="region-name-input" />
      <Input label="País" value={data.country} onChange={(e) => setData({...data, country: e.target.value})} />
      <Input label="Estado" value={data.state} onChange={(e) => setData({...data, state: e.target.value})} />
      <Input label="Ciudad" value={data.city} onChange={(e) => setData({...data, city: e.target.value})} />
      <Input label="Código Postal" value={data.zip_code} onChange={(e) => setData({...data, zip_code: e.target.value})} />
      <Checkbox label="Región Activa" checked={data.is_active} onChange={(e) => setData({...data, is_active: e.target.checked})} />
      {/* REFACTOR FASE 4: Botón Primario y Secundario */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t mt-4">
        <TouchButton type="button" onClick={onCancel} variant="secondary" className="flex-1 sm:flex-none">Cancelar</TouchButton>
        <TouchButton type="submit" variant="primary" className="flex-1" data-testid="region-save-button">Guardar Región</TouchButton>
      </div>
    </form>
  );
}

// --- Componente: Formulario de Tasa de Impuesto (Interno) ---
function TaxRateForm({ onSave, onCancel }: { onSave: (data: any) => void, onCancel: () => void }) {
  const [data, setData] = useState({ name: '', rate: 0.0, priority: 1 });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(data);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Nombre de la Tasa (ej. IVA, Impuesto Estatal)" value={data.name} onChange={(e) => setData({...data, name: e.target.value})} required data-testid="taxrate-name-input" />
      <Input label="Tasa (Decimal, ej: 0.16 para 16%)" type="number" step="0.001" min="0" max="1" value={data.rate} onChange={(e) => setData({...data, rate: parseFloat(e.target.value) || 0})} required data-testid="taxrate-rate-input" />
      <Input label="Prioridad (Orden de cálculo)" type="number" step="1" min="1" value={data.priority} onChange={(e) => setData({...data, priority: parseInt(e.target.value) || 1})} required />
      
      {/* REFACTOR FASE 4: Botón Primario y Secundario */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t mt-4">
        <TouchButton type="button" onClick={onCancel} variant="secondary" className="flex-1 sm:flex-none">Cancelar</TouchButton>
        <TouchButton type="submit" variant="primary" className="flex-1" data-testid="taxrate-save-button">Guardar Tasa</TouchButton>
      </div>
    </form>
  );
}