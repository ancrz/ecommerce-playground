/**
 * src/components/LoginModal.tsx
 * "Chunk" para el Modal de Inicio de Sesión.
 *
 * REFACTORIZADO (FASE 4):
 * 1. Botones usan clases .btn-primary y .btn-link
 */
import React, { useState } from "react";
import { AlertCircle, Lock } from "lucide-react";
import { Link } from "react-router-dom";

// Importar API y Tipos
import * as api from "../api";
import type { TokenResponse } from "../types";

// Importar componentes reutilizables
import { ResponsiveModal } from "./common/ResponsiveModal";
import { Input } from "./FormControls";
import { TouchButton } from "./common/TouchButton";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (tokenResponse: TokenResponse) => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onLogin,
}: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      // Llama a la API (Módulo 60)
      const guestCartId = localStorage.getItem("cart_id") || undefined;
      const response = await api.apiLogin(username, password, guestCartId);
      if (response.access_token && response.user) {
        // Llama al callback de App.tsx
        onLogin(response);
        onClose(); // Cierra el modal
      } else {
        setError("Credenciales inválidas");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error de red";
      setError("Error al iniciar sesión: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };



  if (!isOpen) return null;

  return (
    <ResponsiveModal
      title="Iniciar Sesión"
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      icon={<Lock className="w-6 h-6" />}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        <Input
          label="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          data-testid="login-username-input"
          autoFocus
        />
        <Input
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="login-password-input"
        />

        {error && (
          <div
            className="flex items-center gap-2 p-3 bg-red-100 text-red-700 rounded-lg text-sm"
            data-testid="login-error"
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* REFACTOR FASE 4: Botón Primario */}
        <TouchButton
          type="submit"
          disabled={loading}
          variant="primary"
          loading={loading}
          className="w-full"
          data-testid="login-submit-button"
        >
          Ingresar
        </TouchButton>

        <div className="text-center mt-4">
          {/* REFACTOR FASE 4: Botón de Enlace */}
          <Link
            to="/password-reset"
            onClick={onClose} // Cierra el modal antes de navegar
            className="text-sm text-blue-600 hover:underline font-medium"
            data-testid="forgot-password-link"
          >
            ¿Olvidó su contraseña?
          </Link>
        </div>
      </form>
    </ResponsiveModal>
  );
}
