/**
 * src/components/LoginModal.tsx
 * "Chunk" para el Modal de Inicio de Sesión.
 *
 * REFACTORIZADO (FASE 4):
 * 1. Botones usan clases .btn-primary y .btn-link
 */
import React, { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

// Importar API y Tipos
import * as api from '../api';
import type { TokenResponse } from '../types';

// Importar componentes reutilizables
import { Modal } from './Modal';
import { Input } from './FormControls';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (tokenResponse: TokenResponse) => void;
}

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Llama a la API (Módulo 60)
      const response = await api.apiLogin(username, password);
      if (response.access_token && response.user) {
        // Llama al callback de App.tsx
        onLogin(response); 
        onClose(); // Cierra el modal
      } else {
        setError('Credenciales inválidas');
      }
    } catch (err: any) {
      setError('Error al iniciar sesión: ' + (err.message || 'Error de red'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && username && password) {
      handleSubmit();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <Modal title="Iniciar Sesión (Admin)" isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-4">
        <Input 
          label="Usuario" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={handleKeyPress}
          data-testid="login-username-input"
          autoFocus
        />
        <Input 
          label="Contraseña" 
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          data-testid="login-password-input"
        />
        
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-100 text-red-700 rounded-lg text-sm" data-testid="login-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        
        {/* REFACTOR FASE 4: Botón Primario */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full"
          data-testid="login-submit-button"
        >
          {loading && <Loader2 size={20} className="animate-spin" />}
          {loading ? 'Iniciando...' : 'Ingresar'}
        </button>
        
        <div className="text-center mt-4">
          {/* REFACTOR FASE 4: Botón de Enlace */}
          <Link 
            to="/password-reset" 
            onClick={onClose} // Cierra el modal antes de navegar
            className="btn-link text-sm"
            data-testid="forgot-password-link"
          >
            ¿Olvidó su contraseña?
          </Link>
        </div>
      </div>
    </Modal>
  );
}