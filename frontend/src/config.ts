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
 * Helper para obtener variables de entorno de forma segura
 * tanto en Vite (Runtime) como en Orval (Build time).
 */
const getEnv = (key: string, fallback: string): string => {
  // Verificamos si estamos en un entorno con import.meta.env (Vite)
  // Usamos un chequeo de tipo string para evitar que esbuild lo marque como error en CJS
  const globalEnv = (typeof process !== 'undefined' && process.env) || {};
  
  try {
    // Intentar acceso dinámico
    const viteEnv = (import.meta as any).env;
    if (viteEnv && viteEnv[key]) return viteEnv[key];
  } catch {
    // Ignorar si falla el acceso a import.meta
  }

  return globalEnv[key] || fallback;
};

/**
 * Configuración de la aplicación.
 * Centraliza el acceso a variables de entorno de Vite.
 */
export const config: AppConfig = {
  apiUrl: getEnv('VITE_API_URL', '/api'),
  backendUrl: getEnv('VITE_BACKEND_URL', 'http://localhost:8042'),
  appName: getEnv('VITE_APP_NAME', 'E-Commerce Demo'),
  debug: getEnv('VITE_DEBUG', 'false') === 'true',
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
