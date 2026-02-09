import React, { useState, useEffect } from 'react';
import { useUI } from '../../components/UIContext';
import * as api from '../../api';
import { BusinessInfo, BusinessInfoUpdate } from '../../types';
import { TouchButton } from '../../components/common/TouchButton';
import { Input } from '../../components/FormControls';
import { Save, FileText } from 'lucide-react';
import { InvoicePreviewModal } from './InvoicePreviewModal';

export function FiscalDataTab() {
  const { alert } = useUI();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BusinessInfoUpdate>({
    name: '',
    rif: '',
    address: '',
    phone: '',
    contact: '', // Required by type but maybe optional in form
  });

  // State for preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadBusinessInfo();
  }, []);

  const loadBusinessInfo = async () => {
    try {
      setLoading(true);
      const info = await api.getBusinessInfo();
      setFormData({
        name: info.name || '',
        rif: info.rif || '',
        address: info.address || '',
        phone: info.phone || '',
        contact: info.contact || '',
      });
    } catch (error) {
      console.error(error);
      alert('Error cargando información fiscal');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.updateBusinessInfo(formData);
      alert('Datos fiscales actualizados correctamente');
    } catch (error) {
      console.error(error);
      alert('Error guardando datos');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setShowPreview(true);
    setPreviewLoading(true);
    try {
      const blob = await api.previewInvoice(formData);
      setPreviewBlob(blob);
    } catch (error: any) {
        console.error(error);
        alert('Error generando vista previa: ' + error.message);
        setShowPreview(false); // Close if fails
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración Fiscal de la Empresa</h3>
      <p className="text-sm text-gray-500 mb-6">
        Estos datos aparecerán en las facturas generadas por el sistema.
      </p>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Razón Social (Nombre Legal)"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej. Farmalux C.A."
            required
          />
          <Input
            label="RIF"
            value={formData.rif || ''}
            onChange={(e) => setFormData({ ...formData, rif: e.target.value })}
            placeholder="Ej. J-12345678-0"
            required
          />
        </div>

        <Input
          label="Dirección Fiscal"
          value={formData.address || ''}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Dirección completa que aparecerá en la factura"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Teléfono de Contacto"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+58 ..."
          />
           <Input
            label="Persona de Contacto (Opcional)"
            value={formData.contact || ''}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            placeholder="Gerente o Administrador"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
          <TouchButton
            type="button"
            variant="secondary"
            icon={FileText}
            onClick={handlePreview}
            className="w-full sm:w-auto"
            loading={previewLoading}
          >
            Visualizar PDF de Prueba
          </TouchButton>

          <TouchButton
            type="submit"
            variant="primary"
            icon={Save}
            loading={loading}
            className="w-full sm:w-auto"
          >
            Guardar Cambios
          </TouchButton>
        </div>
      </form>

      {/* Modal de Previsualización */}
      <InvoicePreviewModal
        isOpen={showPreview}
        onClose={() => {
            setShowPreview(false);
            setPreviewBlob(null); // Clean up
        }}
        pdfBlob={previewBlob}
        isLoading={previewLoading}
        onRefresh={handlePreview}
      />
    </div>
  );
}
