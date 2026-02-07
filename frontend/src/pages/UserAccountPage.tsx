/**
 * src/pages/UserAccountPage.tsx
 * "Chunk" para el "Panel de Usuario" (Ruta: /account).
 *
 * REFACTORIZADO (FASE 4):
 * 1. Botones usan clases .btn-primary y .btn-secondary
 */
import React, { useState } from 'react';
import { User as UserIcon, Lock, Save, Loader2 } from 'lucide-react';

// Importar API y Contexto
import * as api from '../api';
import { useApp } from '../App';
import type { User, UserUpdateRequest, PasswordChangeRequest } from '../types';

// Importar componentes reutilizables
import { Input } from '../components/FormControls';

// --- Componente: Formulario de Perfil ---
const ProfileForm = ({ user, onProfileUpdate }: { 
  user: User; 
  onProfileUpdate: (updatedUser: User) => void;
}) => {
  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    email: user.email || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const updates: UserUpdateRequest = {
        full_name: formData.full_name,
        email: formData.email,
      };
      // Llama a la API (Módulo 60) -> api/auth.py -> PUT /me
      const updatedUser = await api.updateMe(updates);
      setSuccess("¡Perfil actualizado exitosamente!");
      onProfileUpdate(updatedUser); // Actualiza el contexto/storage
    } catch (error: unknown) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="profile-form">
      <Input 
        label="Nombre Completo"
        value={formData.full_name}
        onChange={e => setFormData({...formData, full_name: e.target.value})}
        data-testid="profile-name-input"
      />
      <Input 
        label="Email (Para recuperación)"
        type="email"
        value={formData.email}
        onChange={e => setFormData({...formData, email: e.target.value})}
        data-testid="profile-email-input"
      />
      {error && <div className="text-red-600" data-testid="profile-error">{error}</div>}
      {success && <div className="text-green-600" data-testid="profile-success">{success}</div>}
      
      {/* REFACTOR FASE 4: Botón Primario */}
      <button 
        type="submit" 
        disabled={loading}
        className="btn-primary w-full"
        data-testid="profile-save-button"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
        Guardar Cambios
      </button>
    </form>
  );
};

// --- Componente: Formulario de Cambio de Contraseña ---
const PasswordForm = () => {
  const [formData, setFormData] = useState({
    old_password: "",
    new_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    if (formData.new_password.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      setLoading(false);
      return;
    }
    
    try {
      const request: PasswordChangeRequest = formData;
      // Llama a la API (Módulo 60) -> api/auth.py -> POST /me/password
      await api.changeMyPassword(request);
      setSuccess("¡Contraseña cambiada exitosamente!");
      setFormData({ old_password: "", new_password: "" }); // Limpiar formulario
    } catch (error: unknown) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="password-form">
      <Input 
        label="Contraseña Antigua"
        type="password"
        value={formData.old_password}
        onChange={e => setFormData({...formData, old_password: e.target.value})}
        required
        data-testid="password-old-input"
      />
      <Input 
        label="Nueva Contraseña (Mín. 8 caracteres)"
        type="password"
        value={formData.new_password}
        onChange={e => setFormData({...formData, new_password: e.target.value})}
        required
        minLength={8}
        data-testid="password-new-input"
      />
      {error && <div className="text-red-600" data-testid="password-error">{error}</div>}
      {success && <div className="text-green-600" data-testid="password-success">{success}</div>}
      
      {/* REFACTOR FASE 4: Botón Secundario (Oscuro) */}
      <button 
        type="submit" 
        disabled={loading}
        className="btn-secondary w-full bg-gray-700 text-white hover:bg-gray-800"
        data-testid="password-save-button"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Lock size={18} />}
        Cambiar Contraseña
      </button>
    </form>
  );
};


// --- Componente Principal de la Página ---
export default function UserAccountPage() {
  const { user, forceAppUpdate } = useApp();

  if (!user) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const handleProfileUpdate = (updatedUser: User) => {
    // REFACTOR: Actualizar el localStorage (como en App.tsx)
    localStorage.setItem('user', JSON.stringify(updatedUser));
    // Forzar al AppContext a recargar
    forceAppUpdate();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8" data-testid="account-page">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Mi Cuenta</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Columna 1: Mis Datos */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <UserIcon size={20} />
            Mis Datos
          </h2>
          <ProfileForm user={user} onProfileUpdate={handleProfileUpdate} />
        </div>
        
        {/* Columna 2: Seguridad */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <Lock size={20} />
            Seguridad
          </h2>
          <PasswordForm />
        </div>

      </div>
    </div>
  );
}