/**
 * src/pages/admin-modules/ThemeModule.tsx
 * "Chunk" para la pestaña de Tema (Personalización Visual).
 * REFACTORIZADO (FASE 4):
 * 1. Botón "Guardar Cambios" usa clase .btn-primary
 */
import { useState, useEffect, ChangeEvent, ElementType } from 'react';
import { Save, Package, Building, Palette, DollarSign, TrendingUp, Users, Percent } from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { useUI } from '../components/UIContext';
import type { Customization } from '../types';

// Importar componentes reutilizables
import { Select, TextArea, ColorPicker } from '../components/FormControls';
import { TouchButton } from '../components/common/TouchButton';

// URL base del servidor (relativa, para el proxy)
const SERVER_URL = '';

interface ThemeModuleProps {
  onUpdate: () => void; // Función para forzar el refresh global
}

export default function ThemeModule({ onUpdate }: ThemeModuleProps) {
  const { alert } = useUI();
  const [custom, setCustom] = useState<Partial<Customization>>({});
  const [saving, setSaving] = useState(false);
  
  // Cargar datos al montar
  useEffect(() => {
    api.getCustomization().then(setCustom).catch(async err => await alert("Error cargando config: " + err.message));
  }, [alert]);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      // Llama a la API (Módulo 2)
      const updatedCustom = await api.updateCustomization(custom);
      await alert('✓ Personalización actualizada');
      setCustom(updatedCustom);
      // Forzar refresh global (aplica CSS y fuentes)
      onUpdate(); 
    } catch (error: unknown) {
      await alert('Error guardando: ' + (error as Error).message);
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
      await alert(`✓ Icono de ${moduleName} actualizado`);
    } catch (error: unknown) {
      await alert(`Error subiendo icono: ${(error as Error).message}`);
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

          {/* Nuevos Campos de Identidad Fiscal */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-2">Datos Fiscales (Para Facturación)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Legal / Comercial</label>
                   <input 
                     type="text" 
                     className="w-full border rounded p-2 text-sm"
                     value={custom.name || ''}
                     onChange={(e) => setCustom({...custom, name: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">RIF</label>
                   <input 
                     type="text" 
                     className="w-full border rounded p-2 text-sm"
                     value={custom.rif || ''}
                     onChange={(e) => setCustom({...custom, rif: e.target.value})}
                     placeholder="J-12345678-9"
                   />
                </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                   <input 
                     type="text" 
                     className="w-full border rounded p-2 text-sm"
                     value={custom.phone || ''}
                     onChange={(e) => setCustom({...custom, phone: e.target.value})}
                   />
                </div>
                 <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Fiscal</label>
                   <textarea 
                     className="w-full border rounded p-2 text-sm"
                     rows={2}
                     value={custom.address || ''}
                     onChange={(e) => setCustom({...custom, address: e.target.value})}
                   />
                </div>
            </div>
          </div>

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
        <TouchButton 
          onClick={handleSave} 
          disabled={saving} 
          variant="primary"
          icon={Save}
          data-testid="theme-save-button"
          className="ml-auto" // Align right
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </TouchButton>
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
  // URL base del servidor (si value es relativo)
  const imageUrl = value ? (value.startsWith('http') ? value : `${SERVER_URL}${value}`) : null;

  return (
    <div className="flex items-center gap-4 p-3 border rounded-lg">
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
        {imageUrl ? (
          <img 
            src={`${imageUrl}?t=${cacheKey || '1'}`} 
            alt={label} 
            className="w-full h-full object-contain p-1" 
          />
        ) : (
          <Icon size={24} className="text-gray-500" />
        )}
      </div>
      <div className="grow">
        <label className="block text-sm font-semibold text-gray-700">{label}</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => onChange(e, moduleName)}
          className="block w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          data-testid={`icon-upload-${moduleName}`}
        />
      </div>
    </div>
  );
}