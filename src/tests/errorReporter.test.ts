import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseMock } from './helpers/supabaseMock';

vi.mock('../lib/supabase', async () => {
  const { createSupabaseMock } = await import('./helpers/supabaseMock');
  const mock = createSupabaseMock();
  return { supabase: mock.client, __supabaseMock: mock };
});

import * as supabaseModule from '../lib/supabase';
import {
  calcularHuella,
  construirReporte,
  debeEnviar,
  reiniciarReporter,
  reportarError,
} from '../core/errors/reporter';

const mock = (supabaseModule as unknown as { __supabaseMock: SupabaseMock }).__supabaseMock;

beforeEach(() => {
  mock.reset();
  reiniciarReporter();
  // `import.meta.env.DEV` es true bajo Vitest; el reportero no manda nada en
  // desarrollo, así que para probar el envío hay que simular producción.
  vi.stubEnv('DEV', false);
});

/**
 * Este código corre en el navegador de una familia. Sus reglas — no lanzar
 * nunca, agrupar repeticiones y tener tope — importan más que lo que reporta:
 * un reportero que se desboca es peor que no tener ninguno.
 */
describe('calcularHuella', () => {
  it('da la misma huella al mismo error repetido', () => {
    const stack = 'Error: x\n  at Componente (/assets/index-abc.js:10:5)';
    expect(calcularHuella('render', 'Boom', stack)).toBe(calcularHuella('render', 'Boom', stack));
  });

  it('ignora números de línea y columna', () => {
    // Un mismo fallo cambia de línea entre builds; si eso cambiara la huella,
    // el panel mostraría un error nuevo en cada despliegue.
    const a = calcularHuella('render', 'Boom', 'Error\n  at C (/assets/i.js:10:5)');
    const b = calcularHuella('render', 'Boom', 'Error\n  at C (/assets/i.js:88:31)');
    expect(a).toBe(b);
  });

  it('separa errores distintos', () => {
    expect(calcularHuella('render', 'Boom')).not.toBe(calcularHuella('render', 'Otro'));
    expect(calcularHuella('render', 'Boom')).not.toBe(calcularHuella('promise', 'Boom'));
  });

  it('cabe en la columna de la tabla', () => {
    const largo = calcularHuella('window', 'x'.repeat(5000), 'y'.repeat(5000));
    expect(largo.length).toBeLessThanOrEqual(64);
  });
});

describe('debeEnviar', () => {
  it('deja pasar el primero y corta la repetición inmediata', () => {
    expect(debeEnviar('abc', 1000)).toBe(true);
    expect(debeEnviar('abc', 1500)).toBe(false);
  });

  it('vuelve a dejar pasar cuando se cierra la ventana', () => {
    expect(debeEnviar('abc', 1000)).toBe(true);
    expect(debeEnviar('abc', 1000 + 60_001)).toBe(true);
  });

  it('no confunde errores distintos', () => {
    expect(debeEnviar('abc', 1000)).toBe(true);
    expect(debeEnviar('xyz', 1000)).toBe(true);
  });

  it('corta a los 20 por carga de página', () => {
    // Un bucle de render puede lanzar miles de errores por segundo.
    for (let i = 0; i < 20; i++) expect(debeEnviar(`e${i}`, 1000)).toBe(true);
    expect(debeEnviar('e999', 1000)).toBe(false);
  });
});

describe('construirReporte', () => {
  it('saca mensaje y pila de un Error', () => {
    const error = new Error('Se rompió');
    const reporte = construirReporte('render', error, { source: 'Portada' });

    expect(reporte.message).toBe('Se rompió');
    expect(reporte.stack).toContain('Error: Se rompió');
    expect(reporte.kind).toBe('render');
    expect(reporte.source).toBe('Portada');
  });

  it('acepta que le lancen algo que no es un Error', () => {
    // `throw 'texto'` y las promesas rechazadas con un objeto son habituales.
    expect(construirReporte('promise', 'fallo suelto').message).toBe('fallo suelto');
    expect(construirReporte('promise', { code: 500 }).message).toBe('[object Object]');
  });

  it('nunca deja el mensaje vacío', () => {
    expect(construirReporte('window', '').message).toBe('Error sin mensaje');
    expect(construirReporte('window', null).message).toBe('null');
  });

  it('recorta a los límites que acepta la tabla', () => {
    const error = new Error('m'.repeat(5000));
    error.stack = 's'.repeat(20000);
    const reporte = construirReporte('render', error);

    expect(reporte.message.length).toBe(2000);
    expect(reporte.stack?.length).toBe(8000);
  });

  it('registra dónde pasó', () => {
    const reporte = construirReporte('render', new Error('x'));
    expect(reporte.page_url).toBe(location.href);
    expect(reporte.user_agent).toBe(navigator.userAgent);
  });
});

describe('reportarError', () => {
  it('inserta el reporte en client_errors', async () => {
    expect(await reportarError('render', new Error('Boom'))).toBe(true);

    const [query] = mock.on('client_errors');
    const fila = (query.first('insert')?.[0] as Record<string, unknown>[])[0];
    expect(fila.message).toBe('Boom');
    expect(fila.kind).toBe('render');
    expect(fila.fingerprint).toEqual(expect.any(String));
  });

  it('no manda el mismo error dos veces seguidas', async () => {
    await reportarError('render', new Error('Boom'));
    await reportarError('render', new Error('Boom'));
    expect(mock.on('client_errors')).toHaveLength(1);
  });

  it('en desarrollo no manda nada', async () => {
    vi.stubEnv('DEV', true);
    expect(await reportarError('render', new Error('Boom'))).toBe(false);
    expect(mock.queries).toHaveLength(0);
  });

  it('si la base rechaza el insert, devuelve false sin lanzar', async () => {
    mock.queue('client_errors', { data: null, error: { message: 'RLS' } });
    await expect(reportarError('render', new Error('Boom'))).resolves.toBe(false);
  });

  it('un fallo del propio reportero no puede tumbar la página', async () => {
    // Lo más importante del fichero: reportar nunca puede ser lo que rompe.
    const roto = { toString() { throw new Error('ni el mensaje se puede leer'); } };
    await expect(reportarError('window', roto)).resolves.toBe(false);
  });
});
