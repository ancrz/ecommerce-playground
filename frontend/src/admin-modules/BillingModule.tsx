import React, { useState } from 'react';
import { FileText, Loader2, Eye, Printer } from 'lucide-react';
import * as api from '../api';
import { useFeedback } from '../components/ui/FeedbackModal';

export default function BillingModule() {
  const { showToast } = useFeedback();
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const blob = await api.getInvoicePreview();
      // Crear URL temporal para el PDF
      const url = window.URL.createObjectURL(blob);
      // Abrir en nueva pestaña
      window.open(url, '_blank');
      
      // setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      
      showToast("Vista previa generada", "success");
    } catch (error) {
      console.error(error);
      showToast("Error al generar vista previa", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Facturación y Compliance</h1>
                <p className="text-gray-500 mt-1">Gestión de facturas y cumplimiento fiscal (SENIAT/Providencia 0071).</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarjeta de Prueba de Factura */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <FileText size={100} />
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2 relative z-10">Vista Previa de Factura</h3>
                <p className="text-sm text-gray-500 mb-6 relative z-10">
                    Genere un PDF de prueba con datos ficticios para verificar el formato, cálculo de IGTF, y diseño de la factura legal.
                </p>
                
                <button
                    onClick={handlePreview}
                    disabled={loading}
                    className="relative z-10 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-500/20"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Eye size={20} />}
                    {loading ? 'Generando PDF...' : 'Visualizar PDF de Prueba'}
                </button>
            </div>

            {/* Placeholder for future features */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 border-dashed flex flex-col items-center justify-center text-center opacity-75">
                <Printer size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-500 mb-1">Cola de Impresión</h3>
                <p className="text-xs text-gray-400">Próximamente: Gestión de impresoras fiscales y reportes Z.</p>
            </div>
        </div>
    </div>
  );
}
