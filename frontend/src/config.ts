/**
 * src/config.ts
 * Configuración centralizada del frontend.
 * 
 * Lee las variables de entorno de Vite (import.meta.env)
 * y las expone como constantes tipadas.
 * 
 * Las variables de Vite deben tener prefijo VITE_
 * y se definen en frontend/.env o frontend/.env.local
 */

interface AppConfig {
  /** URL base para llamadas API (normalmente /api con proxy) */
  apiUrl: string;
  
  /** URL base del backend (para imágenes y assets directos) */
  backendUrl: string;
  
  /** Nombre de la aplicación */
  appName: string;
  
  /** Modo debug activo */
  debug: boolean;
}

/**
 * Configuración de la aplicación.
 * Centraliza el acceso a variables de entorno de Vite.
 */
export const config: AppConfig = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8042',
  appName: import.meta.env.VITE_APP_NAME || 'E-Commerce Demo',
  debug: import.meta.env.VITE_DEBUG === 'true',
};

/**
 * Helper para construir URLs de imágenes del backend.
 * @param path Ruta relativa de la imagen (ej: /uploads/products/123.jpg)
 */
export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  
  // Si ya es una URL completa, retornarla tal cual
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Construir URL completa con el backend
  return `${config.backendUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

export default config;
