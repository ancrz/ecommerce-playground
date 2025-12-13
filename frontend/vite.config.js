import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Puerto para el servidor de desarrollo de Vite
    proxy: {
      // Proxy para las llamadas a la API
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      // Proxy para las imágenes (uploads)
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
});
