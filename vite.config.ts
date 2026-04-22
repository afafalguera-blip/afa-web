import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
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
