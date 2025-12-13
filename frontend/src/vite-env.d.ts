/// <reference types="vite/client" />

/**
 * Declaración de tipos para las variables de entorno de Vite.
 * Define las variables VITE_* disponibles en import.meta.env
 */
interface ImportMetaEnv {
  /** URL base para llamadas API */
  readonly VITE_API_URL: string;
  
  /** URL base del backend (para imágenes y assets) */
  readonly VITE_BACKEND_URL: string;
  
  /** Nombre de la aplicación */
  readonly VITE_APP_NAME: string;
  
  /** Modo debug (string "true" o "false") */
  readonly VITE_DEBUG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
