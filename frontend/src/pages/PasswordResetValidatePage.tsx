/**
 * src/pages/PasswordResetValidatePage.tsx
 * "Chunk" para "Recuperar Contraseña - Paso 2".
 * Ruta pública: /password-reset/validate
 *
 * Valida el código de 6 dígitos (token) y establece la nueva contraseña.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { Input } from '../components/FormControls';

export default function PasswordResetValidatePage() {
  const [token, setToken] = useState(""); // El código de 6 dígitos
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false); // Para mostrar el mensaje de éxito
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Obtener el email del estado de navegación (enviado desde el Paso 1)
  const email = location.state?.email;

  // Redirigir si el usuario llegó aquí sin pasar por el Paso 1
  useEffect(() => {
    if (!email) {
      navigate('/password-reset');
    }
  }, [email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      // Llama a la API (Módulo 60) -> api/auth.py -> POST /validate-password-reset
      await api.validatePasswordReset(email, token, newPassword);
      
      // ¡Éxito!
      setSuccess(true);
      
    } catch (e: any) {
      // Error (ej. "Código inválido o expirado")
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div 
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md" 
        data-testid="password-reset-validate-page"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Validar Código
        </h2>
        
        {/* Vista de Éxito */}
        {success ? (
          <div className="text-center" data-testid="reset-success-view">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-4">¡Contraseña Cambiada!</h3>
            <p className="text-gray-600 mb-6">
              Tu contraseña ha sido actualizada exitosamente.
            </p>
            <Link 
              to="/" 
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
              data-testid="back-to-login-link"
            >
              Ir a Iniciar Sesión
            </Link>
          </div>
        ) : (
          // Vista de Formulario
          <>
            <p className="text-center text-gray-600 mb-6">
              Enviamos un código de 6 dígitos a <strong>{email || "tu correo"}</strong>.
              Ingrésalo abajo (expira en 15 min).
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                label="Código de 6 dígitos"
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                required
                maxLength={6}
                data-testid="reset-token-input"
                autoFocus
              />
              <Input 
                label="Nueva Contraseña (Mín. 8 caracteres)"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                data-testid="reset-new-password-input"
              />
              
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-100 text-red-700 rounded-lg text-sm" data-testid="reset-error">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading || token.length < 6 || newPassword.length < 8}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2"
                data-testid="reset-validate-button"
              >
                {loading ? <Loader2 className="animate-spin" /> : <KeyRound size={18} />}
                Cambiar Contraseña
              </button>
            </form>
            
            <div className="text-center mt-6">
              <Link 
                to="/password-reset" 
                className="text-sm text-blue-600 hover:underline"
                data-testid="resend-code-link"
              >
                ¿No recibiste el código? Reenviar
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}