import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('@supabase/supabase-js')) return 'vendor-supabase';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-recharts';
          if (id.includes('xlsx') || id.includes('exceljs') || id.includes('html2canvas') || id.includes('jspdf')) return 'vendor-export';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
})
