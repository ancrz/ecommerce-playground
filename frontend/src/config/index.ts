/**
 * Centralized Configuration Wrapper
 * Wraps import.meta.env to provide type safety and fallbacks.
 */
export const config = {
  API_URL: import.meta.env.VITE_API_URL || '/api',
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8042',
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
};
