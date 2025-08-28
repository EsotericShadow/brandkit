import path from 'path';
import { defineConfig } from 'vite';

// Vite automatically exposes env vars prefixed with VITE_ via import.meta.env.
// No need to define process.env shims.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787'
    }
  }
});
