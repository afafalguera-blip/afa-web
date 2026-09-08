import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'AFA Escola Falguera',
        short_name: 'AFA Falguera',
        description:
          "Web de l'AFA de l'Escola Falguera: extraescolars, acollida, botiga i notícies.",
        lang: 'ca',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F9FBF7',
        theme_color: '#8DB600',
        categories: ['education'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Solo el esqueleto estático: HTML, JS, CSS y fuentes propias. Las
        // imágenes viven en Supabase Storage y se cachean en runtime, no en el
        // precache, para no obligar a descargar la web entera al instalar.
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        // El SPA sirve cualquier ruta desde index.html, pero /storage es el
        // proxy a Supabase: si cayera en el fallback, las imágenes devolverían
        // HTML.
        navigateFallbackDenylist: [/^\/storage\//],
        runtimeCaching: [
          {
            // Los catálogos i18n se piden por HTTP al arrancar: sin ellos la
            // app abierta sin red enseñaría las claves crudas.
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/locales/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'afa-locales' },
          },
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/storage/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'afa-storage',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    proxy: {
      '/storage': {
        target: 'https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storage/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('@supabase/supabase-js')) return 'vendor-supabase';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-recharts';
          if (id.includes('xlsx') || id.includes('exceljs') || id.includes('html2canvas') || id.includes('jspdf')) return 'vendor-export';
        },
      },
    },
  },
})
