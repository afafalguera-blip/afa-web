import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra la app construida y un Supabase local levantado con
 * `supabase start` (ver .github/workflows/e2e.yml).
 *
 * Se prueba sobre `vite preview`, no sobre `vite dev`: lo que se quiere validar
 * es el bundle que acaba en producción, con su minificación y su code
 * splitting, no el servidor de desarrollo.
 */
export default defineConfig({
  testDir: './e2e',
  // Sin paralelismo entre ficheros: comparten una única base de datos local y
  // los tests que escriben se pisarían.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ca-ES',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
