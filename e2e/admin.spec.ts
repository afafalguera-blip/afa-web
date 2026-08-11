import { test, expect } from '@playwright/test';

/**
 * Login del panel, contra el Supabase local y el admin del seed.
 *
 * Es el único recorrido donde un fallo deja a la junta sin poder gestionar
 * nada: sin login no hay inscripciones, ni cobros, ni contenido.
 */

const ADMIN = { email: 'admin@example.test', password: 'provaE2E!2026' };

async function rellenarLogin(page: import('@playwright/test').Page, email: string, pass: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(pass);
  await page.locator('button[type="submit"]').click();
}

test('el panel no se abre sin sesión', async ({ page }) => {
  await page.goto('/admin/dashboard');
  // Da igual si redirige a /login o pinta un aviso: lo que no puede es enseñar
  // el panel.
  await expect(page).not.toHaveURL(/\/admin\/dashboard$/, { timeout: 15_000 });
});

test('una contraseña equivocada no deja entrar', async ({ page }) => {
  await rellenarLogin(page, ADMIN.email, 'contrasenya-incorrecta');

  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('#root')).not.toBeEmpty();
});

test('un correo que no existe tampoco', async ({ page }) => {
  await rellenarLogin(page, 'ningu@example.test', ADMIN.password);

  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(/\/login/);
});

test('el admin del seed entra y ve el panel', async ({ page }) => {
  await rellenarLogin(page, ADMIN.email, ADMIN.password);

  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByRole('alert').filter({ hasText: /deixat de funcionar/i })).toHaveCount(0);
});

test('la sesión sobrevive a recargar', async ({ page }) => {
  await rellenarLogin(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });

  await page.reload();

  // Si la sesión no persistiera, cada F5 echaría a la junta fuera del panel.
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.locator('#root')).not.toBeEmpty();
});

test('la pantalla de errores del navegador carga', async ({ page }) => {
  await rellenarLogin(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });

  await page.goto('/admin/errors');
  await expect(page.locator('#root')).not.toBeEmpty();
  // Sin errores registrados debe decirlo, no quedarse en blanco.
  await expect(page.getByText(/cap error|errors del navegador/i).first()).toBeVisible({
    timeout: 15_000,
  });
});
