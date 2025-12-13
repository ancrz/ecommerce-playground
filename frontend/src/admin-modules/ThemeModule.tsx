/**
 * src/pages/admin-modules/ThemeModule.tsx
 * "Chunk" para la pestaña de Tema (Personalización Visual).
 * REFACTORIZADO (FASE 4):
 * 1. Botón "Guardar Cambios" usa clase .btn-primary
 */
import React, { useState, useEffect, ChangeEvent, ElementType } from 'react';
import { Save, Upload, Package, Building, Palette, DollarSign, TrendingUp, Users, Percent } from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import type { Customization } from '../../types';

// Importar componentes reutilizables
import { Select, TextArea, ColorPicker } from '../components/FormControls';

// URL base del servidor (relativa, para el proxy)
const SERVER_URL = '';

interface ThemeModuleProps {
  onUpdate: () => void; // Función para forzar el refresh global
}

export default function ThemeModule({ onUpdate }: ThemeModuleProps) {
  const [custom, setCustom] = useState<Partial<Customization>>({});
  const [saving, setSaving] = useState(false);
  
  // Cargar datos al montar
  useEffect(() => {
    api.getCustomization().then(setCustom).catch(err => alert("Error cargando config: " + err.message));
  }, []);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      // Llama a la API (Módulo 2)
      const updatedCustom = await api.updateCustomization(custom);
      alert('✓ Personalización actualizada');
      setCustom(updatedCustom);
      // Forzar refresh global (aplica CSS y fuentes)
      onUpdate(); 
    } catch (error: any) {
      alert('Error guardando: ' + error.message);
    }
    setSaving(false);
  };
  
  const handleIconUpload = async (e: ChangeEvent<HTMLInputElement>, moduleName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSaving(true);
    try {
      // Llama a la nueva API de iconos de módulo (Módulo 2)
      const updatedCustom = await api.uploadModuleIcon(moduleName, file);
      setCustom(updatedCustom); // Actualizar estado local con todos los datos
      onUpdate(); // Refrescar AdminPanel.tsx (para mostrar el nuevo icono)
      alert(`✓ Icono de ${moduleName} actualizado`);
    } catch (error: any) {
      alert(`Error subiendo icono: ${error.message}`);
    }
    setSaving(false);
  };
  
  // Lista de fuentes (debe coincidir con index.html y/o CSS)
  const fonts = ['Poppins', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Inter', 'Chillax Variable'];
  
  // Lista de iconos de módulo (para el formulario)
  const moduleIcons = [
    { name: 'products', label: 'Icono Productos', icon: Package, value: custom.icon_products_url },
    { name: 'business', label: 'Icono Contenido/Negocio', icon: Building, value: custom.icon_business_url },
    { name: 'customization', label: 'Icono Tema/Visual', icon: Palette, value: custom.icon_customization_url },
    { name: 'finance', label: 'Icono Finanzas', icon: DollarSign, value: custom.icon_finance_url },
    { name: 'sales', label: 'Icono Ventas', icon: TrendingUp, value: custom.icon_sales_url },
    { name: 'users', label: 'Icono Usuarios (RBAC)', icon: Users, value: custom.icon_users_url },
    { name: 'tax', label: 'Icono Impuestos', icon: Percent, value: custom.icon_tax_url },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Identidad Visual</h2>
        <div className="space-y-4">
          <ColorPicker label="Color Primario (Header, Footer, Botones)" value={custom.primary_color || '#264192'} onChange={(val) => setCustom({...custom, primary_color: val})} />
          <ColorPicker label="Color Secundario (Acentos, Ofertas)" value={custom.secondary_color || '#ffdd00'} onChange={(val) => setCustom({...custom, secondary_color: val})} />
          <ColorPicker label="Color de Acento (Texto sobre Primario)" value={custom.accent_color || '#ffffff'} onChange={(val) => setCustom({...custom, accent_color: val})} />
          
          <Select 
            label="Fuente Principal (Tipografía)" 
            value={custom.font_family || 'Poppins'} 
            onChange={(e) => setCustom({...custom, font_family: e.target.value})}
            data-testid="theme-font-select"
          >
            {fonts.map(font => <option key={font} value={font}>{font}</option>)}
          </Select>
          <TextArea 
            label="CSS Personalizado (Avanzado)"
            value={custom.custom_css || ''}
            onChange={(e) => setCustom({...custom, custom_css: e.target.value})}
            rows={10}
            className="font-mono text-sm"
            placeholder={`.product-card { border-radius: 1rem; }\nh1 { font-family: "Chillax Variable", sans-serif; font-weight: 600; }`}
            data-testid="theme-css-input"
          />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Iconos de Módulos (64x64px)</h2>
        <div className="space-y-4">
          {moduleIcons.map(item => (
            <IconUploader
              key={item.name}
              label={item.label}
              moduleName={item.name}
              value={item.value}
              onChange={handleIconUpload}
              Icon={item.icon}
              cacheKey={custom.updated_at}
            />
          ))}
        </div>
      </div>
      
      <div className="md:col-span-2 text-right mt-6">
        {/* REFACTOR FASE 4: Botón Primario */}
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="btn-primary"
          data-testid="theme-save-button"
        >
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}

// --- Componente: Subidor de Iconos de Módulo (Interno) ---
function IconUploader(
  { label, moduleName, value, onChange, Icon, cacheKey }: 
  { 
    label: string, 
    moduleName: string, 
    value?: string | null, 
    onChange: (e: ChangeEvent<HTMLInputElement>, moduleName: string) => void, 
    Icon: ElementType,
    cacheKey?: string
  }
) {
  return (
    <div className="flex items-center gap-4 p-3 border rounded-lg">
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
        {value ? (
          <img src={`${SERVER_URL}${value}?t=${cacheKey || '1'}`} alt={label} className="w-full h-full object-contain image-preview" />
        ) : (
          <Icon size={24} className="text-gray-500" />
        )}
      </div>
      <div className="flex-grow">
        <label className="block text-sm font-semibold text-gray-700">{label}</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => onChange(e, moduleName)}
          className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          data-testid={`icon-upload-${moduleName}`}
        />
      </div>
    </div>
  );
}