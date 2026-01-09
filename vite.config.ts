import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dôležité pre Capacitor: relatívne cesty k assetom
  base: './',
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  server: {
    headers: {
      'Permissions-Policy': 'camera=*, microphone=*, geolocation=*'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});