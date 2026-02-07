import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno del directorio actual
  const env = loadEnv(mode, process.cwd(), '');
  
  // URL del backend desde variable de entorno o default
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8042';
  const frontendPort = parseInt(env.FRONTEND_PORT || '5173');
  
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: frontendPort, // Puerto para el servidor de desarrollo de Vite
      proxy: {
        // Proxy para las llamadas a la API
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          ws: true
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
