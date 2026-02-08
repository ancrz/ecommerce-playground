import React, { useState } from 'react';
import { Mail, CheckCircle, XCircle, Loader2, Server } from 'lucide-react';
import * as api from '../api';
import { useFeedback } from '../components/ui/FeedbackModal';

export default function SMTPConfigModule() {
  const { showToast } = useFeedback();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);

  // En una implementación real, cargaríamos la config actual del backend.
  // Por ahora, asumimos que se configura vía ENV vars en el backend,
  // así que este panel es solo para PROBAR la conexión existente.
  // Si quisiéramos editar, necesitaríamos un endpoint GET/PUT /api/admin/config/smtp.
  
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.checkSMTPConnection();
      setTestResult(result);
      if (result.status === 'success') {
        showToast("Conexión SMTP exitosa", "success");
      } else {
        showToast("Fallo la conexión SMTP", "error");
      }
    } catch (error) {
      console.error(error);
      setTestResult({ status: 'failed', message: "Error de red o servidor." });
      showToast("Error al probar conexión", "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuración SMTP</h1>
                <p className="text-gray-500 mt-1">Gestión del servidor de correos y notificaciones.</p>
            </div>
            <div className="flex gap-3">
                 {/* Placeholder buttons for future config editing */}
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Server size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Estado del Servicio de Correo</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Verifique que el servidor backend tiene acceso al servidor SMTP configurado (Gmail, SendGrid, etc).
                        Esta prueba envía un comando HELO/EHLO al servidor.
                    </p>

                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <button
                            onClick={handleTestConnection}
                            disabled={testing}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white transition-all ${
                                testing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                            }`}
                        >
                            {testing ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
                            {testing ? 'Verificando...' : 'Probar Conexión SMTP'}
                        </button>
                        
                        {testResult && (
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                                testResult.status === 'success' 
                                ? 'bg-green-50 border-green-200 text-green-700' 
                                : 'bg-red-50 border-red-200 text-red-700'
                            } animate-fade-in`}>
                                {testResult.status === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                <span className="font-medium">{testResult.message}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        
        {/* Placeholder for Environment Variables instruction */}
        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
             <h4 className="font-bold text-orange-800 mb-2">Nota de Configuración</h4>
             <p className="text-sm text-orange-700">
                 La configuración SMTP (Host, Puerto, Usuario, Password) se gestiona actualmente a través de las variables de entorno 
                 (<code>.env</code>) en el servidor por razones de seguridad. Asegúrese de reiniciar el backend si cambia estas variables.
             </p>
        </div>
    </div>
  );
}
