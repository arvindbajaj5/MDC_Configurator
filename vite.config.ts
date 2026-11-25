import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          exports: ['jspdf', 'pptxgenjs']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
