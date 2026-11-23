import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

const isSingleFile = process.env.SINGLEFILE === 'true';
const basePath = process.env.VITE_BASE_PATH || './';

export default defineConfig({
  base: isSingleFile ? './' : basePath,
  plugins: [
    react(),
    ...(isSingleFile
      ? [viteSingleFile()]
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: [
              'data/mdc_supply_intel.json',
              'data/mdc_master_catalog.json',
              'data/sample_navi_mumbai_15mw.json'
            ],
            manifest: {
              name: 'AI Modular Data Center Configurator V13',
              short_name: 'MDC Studio V13',
              description: 'Turnkey Sovereign & Enterprise AI Modular Data Center Engineering Configurator',
              theme_color: '#002870',
              background_color: '#FFFFFF',
              display: 'standalone',
              icons: []
            },
            workbox: {
              cacheId: 'mdc-configurator-v13',
              globPatterns: ['**/*.{js,css,html,json,svg,png,woff2}'],
              maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
              runtimeCaching: [
                {
                  urlPattern: /^https:\/\/archive-api\.open-meteo\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'open-meteo-era5-cache',
                    expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }
                  }
                }
              ]
            }
          })
        ])
  ],
  build: {
    target: 'es2022',
    sourcemap: !isSingleFile,
    chunkSizeWarningLimit: 900,
    rollupOptions: isSingleFile
      ? undefined
      : {
          output: {
            manualChunks: {
              react: ['react', 'react-dom'],
              icons: ['lucide-react'],
              three: ['three'],
              exporters: ['pptxgenjs', 'jspdf']
            }
          }
        }
  }
});
