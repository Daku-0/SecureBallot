import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo, las llamadas a /api se reenvian al backend (node backend/server.js)
    proxy: { '/api': 'http://localhost:3001' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    // Extension .vtest.jsx a proposito: el Jest de la raiz del repo NO las recoge
    include: ['tests/**/*.vtest.{js,jsx}'],
  },
});
