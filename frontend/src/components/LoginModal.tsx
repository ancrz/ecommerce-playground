/**
 * LoginModal.tsx - Premium Auth (Stitch Design v3.0)
 * 
 * REFACTORIZADO v4:
 * - Glassmorphism UI
 * - Floating Labels
 * - Social Login Placeholders
 * - Micro-interactions
 */


import React, { useState, useEffect } from 'react';
import { Mail, Lock, X, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as api from '../api';
import type { TokenResponse, BusinessInfo } from '../types';
import { config, getImageUrl } from '../config';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (tokenResponse: TokenResponse) => void;
  onRegisterClick: () => void;
}

export default function LoginModal({ isOpen, onClose, onLogin, onRegisterClick: _onRegisterClick }: LoginModalProps) {
  // Config State
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [appName, setAppName] = useState<string>(config.appName);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validar si es "invitado" (solo empleados)
  // El usuario indica que este login es SOLO para empleados.

  useEffect(() => {
    if (isOpen) {
        // Cargar info del negocio al abrir
        api.getBusinessInfo()
            .then(info => {
                setBusinessInfo(info);
                if (info.name) setAppName(info.name);
            })
            .catch(() => {
                // Fallback silencioso a config.appName
            });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const guestCartId = localStorage.getItem('cart_id') || undefined;
      const response = await api.apiLogin(username, password, guestCartId);
      if (response.access_token && response.user) {
        onLogin(response);
        onClose();
      } else {
        setError('Credenciales inválidas');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
        />

        {/* Modal Card */}
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
            
            {/* Header / Brand */}
            <div className="bg-linear-to-r from-blue-600 to-blue-800 p-8 text-center relative overflow-hidden transition-all duration-500">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10 flex flex-col items-center justify-center min-h-[100px]">
                    {businessInfo?.logo_url ? (
                        <div className="w-full flex justify-center mb-2">
                             <img 
                                src={getImageUrl(businessInfo.logo_url) || ''} 
                                alt={appName} 
                                className="h-20 max-w-[280px] object-contain drop-shadow-md"
                             />
                        </div>
                    ) : (
                        <h2 className="text-3xl font-bold text-white tracking-tight break-words max-w-full">
                            {appName}
                        </h2>
                    )}
                    <p className="text-blue-100 text-sm mt-2 font-medium">Bienvenido de nuevo</p>
                </div>
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Form Body */}
            <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Username Input */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Usuario</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-gray-800"
                                placeholder="tu@email.com"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1">
                        <div className="flex justify-between ml-1">
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Contraseña</label>
                             <Link to="/forgot-password" onClick={onClose} className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                                ¿Olvidaste tu contraseña?
                             </Link>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-gray-800"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 animate-shake">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>Ingresar <ArrowRight size={20} /></>}
                    </button>
                </form>
                
                {/* 
                 * NOTA: Se ha removido el enlace de registro para invitados.
                 * Este login es exclusivo para empleados/administradores.
                 */}
            </div>
        </div>
    </div>
  );
}

