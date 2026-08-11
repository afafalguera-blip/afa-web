import { test, expect, type Page } from '@playwright/test';

/**
 * Humo de las rutas públicas.
 *
 * No comprueban textos concretos a propósito: el contenido lo edita la junta
 * desde el panel y cambiaría estos tests cada temporada. Lo que se fija es lo
 * que nunca puede pasar — que la SPA no monte y la familia se quede mirando una
 * pantalla en blanco.
 */

const RUTAS = [
  { ruta: '/', nombre: 'portada' },
  { ruta: '/extraescolars', nombre: 'extraescolars' },
  { ruta: '/botiga', nombre: 'botiga' },
  { ruta: '/quotes', nombre: 'quotes' },
  { ruta: '/calendari', nombre: 'calendari' },
  { ruta: '/contacte', nombre: 'contacte' },
  { ruta: '/extraescolars/inscripcio', nombre: 'formulari inscripció' },
];

/** Errores de consola que no son culpa de la app. */
const RUIDO = [
  /favicon/i,
  /Failed to load resource.*40[34]/i,
  /net::ERR_/i,
  /Download the React DevTools/i,
];

function recogerErrores(page: Page): string[] {
  const errores: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const texto = msg.text();
    if (RUIDO.some((re) => re.test(texto))) return;
    errores.push(texto);
  });
  page.on('pageerror', (err) => errores.push(`pageerror: ${err.message}`));
  return errores;
}

for (const { ruta, nombre } of RUTAS) {
  test(`${nombre} monta y no deja la pantalla en blanco`, async ({ page }) => {
    const errores = recogerErrores(page);

    const respuesta = await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    expect(respuesta?.status(), `${ruta} debería responder 200`).toBe(200);

    // El SPA ha montado: #root tiene contenido de verdad, no el div vacío.
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty({ timeout: 15_000 });
    await expect(page.locator('body')).toContainText(/\S/);

    // Y no ha saltado el ErrorBoundary, que es lo que se vería si petara.
    await expect(page.getByRole('alert').filter({ hasText: /deixat de funcionar/i })).toHaveCount(0);

    expect(errores, `errores de consola en ${ruta}`).toEqual([]);
  });
}

test('la navegación entre secciones no recarga la página', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    (window as unknown as { __sigueVivo: boolean }).__sigueVivo = true;
  });

  await page.goto('/extraescolars');
  await expect(page.locator('#root')).not.toBeEmpty();
});

test('una ruta que no existe no rompe la aplicación', async ({ page }) => {
  // El rewrite de vercel.json manda todo a index.html; si el router no maneja
  // la ruta, la familia debe ver algo, no un fallo.
  await page.goto('/esta-ruta-no-existe-jamas');
  await expect(page.locator('#root')).not.toBeEmpty();
});
