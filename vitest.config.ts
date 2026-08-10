import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // src/lib/supabase.ts lanza al importarse si faltan estas variables, lo que
    // haría intestable cualquier servicio. Valores falsos: los tests no llegan a
    // la red (solo ejercitan la lógica pura de los servicios).
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/utils/**', 'src/logic/**', 'src/constants/**', 'src/services/**'],
    },
  },
})
