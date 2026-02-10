/**
 * RegisterModal.tsx - Premium Registration (Stitch Design v3.0)
 * 
 * DESIGN 10: Frictionless Sign-up Flow
 * - Multi-step or Single-step optimized form
 * - Password strength meter placeholder
 * - Terms & Conditions checkbox with style
 */

import React, { useState } from 'react';
import { User, Lock, Mail, ArrowRight, Loader2, X } from 'lucide-react';
import { config } from '../config';
// import * as api from '../api';
// import type { TokenResponse } from '../types';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick: () => void;
}

export default function RegisterModal({ isOpen, onClose, onLoginClick }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
        setError("Las contraseñas no coinciden");
        return;
    }

    setLoading(true);
    setError('');

    try {
      // Mock Registration API Call (Need to implement real one in api.ts if missing)
      // Assuming api.register exists or using login as placeholder for now
      // console.log("Registering", formData);
      
      // Simulating API delay and success for now as backend might not have this endpoint exposed identically
      // Actually, standard is usually POST /users
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Auto-login after register
      // const response = await api.apiLogin(formData.username, formData.password);
      // onLogin(response);
      
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
        />

        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-gray-50 p-8 pb-0 text-center relative">
                 <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 transition rounded-full"
                >
                    <X size={20} />
                </button>
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl rotate-3 flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <User size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Crear Cuenta</h2>
                <p className="text-gray-500 text-sm mt-1 mb-6">Únete a {config.appName} y disfruta de beneficios exclusivos.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-4">
                
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Usuario</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={18} />
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                            placeholder="Nombre de usuario"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={18} />
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                            placeholder="tu@email.com"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={18} />
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                placeholder="••••"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Confirmar</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={18} />
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                placeholder="••••"
                                required
                            />
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</p>}

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-gray-800 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>Registrarse <ArrowRight size={18} /></>}
                    </button>
                </div>
            </form>
            
            <div className="p-4 text-center bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                <div className="mb-2">
                    ¿Ya tienes cuenta?{' '}
                    <button onClick={onLoginClick} className="font-bold text-blue-600 hover:text-blue-800 transition">
                        Inicia Sesión
                    </button>
                </div>
                Al registrarte aceptas nuestros <a href="#" className="underline hover:text-gray-600">Términos y Condiciones</a>
            </div>
        </div>
    </div>
  );
}
