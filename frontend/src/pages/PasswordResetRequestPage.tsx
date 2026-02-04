/**
 * src/pages/PasswordResetRequestPage.tsx
 * "Chunk" para "Recuperar Contraseña - Paso 1".
 * Ruta pública: /password-reset
 *
 * Pide el email y un Captcha, luego llama a la API
 * para enviar el código de 6 dígitos.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { Input } from '../components/FormControls';

// --- Placeholder para el componente Captcha ---
// En un proyecto real, importaríamos HCaptcha o reCAPTCHA
const CaptchaPlaceholder = ({ onVerify }: { onVerify: (token: string) => void }) => {
  useEffect(() => {
    // Simular que el usuario completa el captcha automáticamente para E2E
    // (En una app real, esto se dispararía con el callback 'onVerify' del widget)
    console.warn("Simulando validación de Captcha...");
    onVerify("dummy-captcha-token-for-e2e-testing");
  }, [onVerify]);

  return (
    <div 
      className="p-4 bg-gray-200 border border-gray-300 rounded-lg text-center text-gray-600"
      data-testid="captcha-placeholder"
    >
      (Aquí iría el widget de hCaptcha/reCAPTCHA)
      <div className="flex items-center justify-center gap-2 mt-2">
         <ShieldCheck size={16} />
         <span className="text-sm">Protegido (Simulación)</span>
      </div>
    </div>
  );
};

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      setError("Por favor, complete la verificación de Captcha.");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      // Llama a la API (Módulo 60) -> api/auth.py -> POST /request-password-reset
      await api.requestPasswordReset(email, captchaToken);
      
      // Éxito. Navegar al Paso 2 (Validación)
      // Pasamos el email en el 'state' de la navegación
      navigate('/password-reset/validate', { state: { email } });
      
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div 
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md" 
        data-testid="password-reset-request-page"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Recuperar Contraseña
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Ingresa tu email y completa el Captcha. Te enviaremos un código de 6 dígitos.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Email Registrado"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            data-testid="reset-email-input"
          />
          
          <CaptchaPlaceholder onVerify={setCaptchaToken} />
          
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-100 text-red-700 rounded-lg text-sm" data-testid="reset-error">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2"
            data-testid="reset-submit-button"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Mail size={18} />}
            Enviar Código
          </button>
        </form>
        
        <div className="text-center mt-6">
          <Link 
            to="/" 
            className="text-sm text-blue-600 hover:underline"
            data-testid="back-to-home-link"
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    </div>
  );
}