import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno del directorio actual
  const env = loadEnv(mode, process.cwd(), '');
  
  // URL del backend desde variable de entorno o default
  const backendUrl = env.VITE_BACKEND_URL || 'http://127.0.0.1:8042';
  
  return {
    plugins: [react()],
    server: {
      port: 5173, // Puerto para el servidor de desarrollo de Vite
      proxy: {
        // Proxy para las llamadas a la API
        '/api': {
          target: backendUrl,
          changeOrigin: true
        },
        // Proxy para las imágenes (uploads)
        '/uploads': {
          target: backendUrl,
          changeOrigin: true
        }
      }
    }
  };
});
