import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/dashboard'),
  build: {
    outDir: path.resolve(__dirname, 'dist/dashboard'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/agent': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/dashboard/ws': {
        target: 'ws://localhost:8787',
        ws: true,
      },
    },
  },
});
