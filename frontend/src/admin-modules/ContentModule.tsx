/**
 * src/pages/admin-modules/ContentModule.tsx
 * "Chunk" para la pestaña de Contenido (Información del Negocio).
 * REFACTORIZADO (FASE 4):
 * 1. Botones usan clases .btn-primary, .btn-link, .btn-icon
 */
import { useState, useEffect } from 'react'; // React removed (unused), ChangeEvent/ElementType removed
import { Save, Plus, Trash2 } from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import type { BusinessInfo, SocialNetwork } from '../types'; // Fix: ../types instead of ../../types
import type { BusinessInfoUpdate } from '../types';

// Importar componentes reutilizables
import { Input } from '../components/FormControls'; // Select removed

// URL base del servidor (relativa, para el proxy)
const SERVER_URL = '';

interface ContentModuleProps {
  onUpdate: () => void; // Función para forzar el refresh global
}

import { useToast } from '../components/ui/Toast';

export default function ContentModule({ onUpdate }: ContentModuleProps) {
  const [info, setInfo] = useState<Partial<BusinessInfo>>({ social_networks: [] });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  // Cargar datos al montar
  useEffect(() => {
    api.getBusinessInfo().then(setInfo).catch(err => toast("Error cargando info: " + err.message, 'error'));
  }, []);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Usar el DTO de Actualización (definido en el backend)
      const updateDto: BusinessInfoUpdate = {
        name: info.name,
        rif: info.rif,
        contact: info.contact,
        social_networks: info.social_networks
      };
      // 2. Llamar a la API de Negocio (Módulo 19)
      await api.updateBusinessInfo(updateDto);
      toast('✓ Información actualizada', 'success');
      // 3. Forzar refresh global (actualiza Header/Footer)
      onUpdate();
    } catch (error: any) {
      toast('Error guardando: ' + error.message, 'error');
    }
    setSaving(false);
  };
  
  // Manejador genérico para Logo e Icono
  const handleUpload = async (
    file: File | null | undefined, 
    uploader: (file: File) => Promise<BusinessInfo>, // La función de api.ts
    field: 'logo_url' | 'icon_url'
  ) => {
    if (!file) return;
    setSaving(true);
    try {
      // 1. Llama al Orquestador de Imágenes (Módulo 20)
      const res = await uploader(file);
      
      // 2. Actualizar el estado local con la respuesta
      setInfo((prevInfo: Partial<BusinessInfo>) => ({...prevInfo, [field]: res[field] }));
      toast(`✓ ${field === 'logo_url' ? 'Logo' : 'Icono'} actualizado`, 'success');
      
      // 3. Forzar refresh global
      onUpdate();
    } catch (error: any) {
      toast(`Error subiendo imagen: ${error.message}`, 'error');
    }
    setSaving(false);
  };
  
  const handleSocialIconUpload = async (index: number, file: File | null | undefined) => {
    if (!file) return;
    setSaving(true);
    try {
      const updatedInfo = await api.uploadSocialNetworkIcon(index, file);
      setInfo(updatedInfo);
      toast('✓ Icono de red social actualizado.', 'success');
      onUpdate();
    } catch (error: any) {
      toast(`Error subiendo icono: ${error.message}`, 'error');
    }
    setSaving(false);
  };
  
  // --- Funciones para la lista dinámica de Redes Sociales ---
  
  const addNetwork = () => {
    setInfo((prev: Partial<BusinessInfo>) => ({...prev, social_networks: [...(prev.social_networks || []), { name: 'facebook', url: '' }]}));
  };
  
  const updateNetwork = (index: number, field: 'name' | 'url' | 'icon', value: string) => {
    const networks = [...(info.social_networks || [])];
    networks[index] = {...networks[index], [field]: value} as SocialNetwork;
    setInfo({...info, social_networks: networks });
  };
  
  const removeNetwork = (index: number) => {
    setInfo((prev: Partial<BusinessInfo>) => ({...prev, social_networks: prev.social_networks?.filter((_: SocialNetwork, i: number) => i !== index)}));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Información del Negocio</h2>
        <div className="space-y-4">
          <Input 
            label="Nombre del Negocio" 
            value={info.name || ''} 
            onChange={(e) => setInfo({...info, name: e.target.value})} 
            data-testid="content-name-input"
          />
          <Input 
            label="RIF" 
            value={info.rif || ''} 
            onChange={(e) => setInfo({...info, rif: e.target.value})} 
          />
          <Input 
            label="Contacto (Teléfono/Email)" 
            value={info.contact || ''} 
            onChange={(e) => setInfo({...info, contact: e.target.value})} 
          />
          
          <h3 className="text-lg font-semibold pt-4 border-t mt-6">Redes Sociales</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 items-center font-semibold text-sm text-gray-600 px-1">
              <div className="col-span-3">Nombre</div>
              <div className="col-span-4">URL</div>
              <div className="col-span-5">Icono</div>
            </div>
            {info.social_networks?.map((net: SocialNetwork, index: number) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-center" data-testid={`social-row-${index}`}>
                <div className="col-span-3">
                  <Input 
                    placeholder="Ej: Facebook" 
                    value={net.name} 
                    onChange={(e) => updateNetwork(index, 'name', e.target.value)}
                  />
                </div>
                <div className="col-span-4">
                  <Input 
                    placeholder="https://facebook.com/usuario" 
                    value={net.url} 
                    onChange={(e) => updateNetwork(index, 'url', e.target.value)}
                  />
                </div>
                <div className="col-span-4 flex items-center gap-2">
                  <Input 
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSocialIconUpload(index, e.target.files?.[0])}
                  />
                  {net.icon && (
                    <img src={net.icon} alt={`${net.name} icon`} className="w-8 h-8 object-contain image-preview shrink-0" />
                  )}
                </div>
                <div className="col-span-1 text-right">
                  <button 
                    onClick={() => removeNetwork(index)} 
                    className="btn-icon text-red-500"
                    data-testid={`social-delete-${index}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={addNetwork} 
            className="btn-link mt-4"
            data-testid="social-add-button"
          >
            <Plus size={16} /> Agregar Red Social
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Logo (400x200px)</h3>
          {info.logo_url && <img src={`${SERVER_URL}${info.logo_url}?t=${info.updated_at}`} className="w-full h-24 object-contain image-preview mb-4" />}
          <Input 
            type="file" 
            accept="image/*" 
            onChange={(e) => handleUpload(e.target.files?.[0], api.uploadBusinessLogo, 'logo_url')} 
            data-testid="content-logo-upload"
          />
        </div>

        {/* REFACTOR: Nuevo campo para Isotipo (Icono de Pestaña/Favicon) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Isotipo / Favicon (64x64px)</h3>
          {info.icon_url && <img src={`${SERVER_URL}${info.icon_url}?t=${info.updated_at}`} className="w-16 h-16 object-contain image-preview mb-4" />}
          <Input 
            type="file" 
            accept="image/*" 
            onChange={(e) => handleUpload(e.target.files?.[0], api.uploadBusinessIcon, 'icon_url')} 
            data-testid="content-icon-upload"
          />
          <p className="text-xs text-gray-500 mt-2">
            Este icono se usará en la pestaña del navegador y reemplazará el texto del título si está presente.
          </p>
        </div>
      </div>

      <div className="md:col-span-3 text-right mt-6">
        {/* REFACTOR FASE 4: Botón Primario */}
        <button 
          onClick={handleSave} 
          disabled={saving} 
          data-testid="content-save-button" 
          className="btn-primary"
        >
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}