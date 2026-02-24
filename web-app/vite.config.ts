/// <reference types="vitest" />
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '../',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  resolve: {
    alias: {
      '@smart-spotify-curator/shared': path.resolve(__dirname, '../shared/src/index.ts'),
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 8000,
    host: '127.0.0.1'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'firebase-vendor';
            if (id.includes('@radix-ui')) return 'radix-vendor';
            if (id.includes('lucide-react')) return 'lucide-vendor';
            if (id.includes('@tanstack')) return 'query-vendor';
            if (id.includes('zod')) return 'zod-vendor';
            if (
              id.includes('react/') ||
              id.includes('react-dom/') ||
              id.includes('react-router-dom/')
            )
              return 'react-vendor';
          }
          return undefined;
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false
  }
});
