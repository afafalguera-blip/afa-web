import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseMock } from './helpers/supabaseMock';

vi.mock('../lib/supabase', async () => {
  const { createSupabaseMock } = await import('./helpers/supabaseMock');
  const mock = createSupabaseMock();
  return { supabase: mock.client, __supabaseMock: mock };
});

import * as supabaseModule from '../lib/supabase';
import { ConfigService } from '../services/ConfigService';

const mock = (supabaseModule as unknown as { __supabaseMock: SupabaseMock }).__supabaseMock;

const CACHE_PREFIX = 'afa_config_';
const TTL_MS = 10 * 60 * 1000;

/** Escribe directamente una entrada de caché con la antigüedad que se quiera. */
function seedCache(key: string, value: unknown, ageMs = 0) {
  localStorage.setItem(
    CACHE_PREFIX + key,
    JSON.stringify({ value, ts: Date.now() - ageMs }),
  );
}

beforeEach(() => {
  mock.reset();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * La configuración se cachea 10 minutos en localStorage. Si la caché no expira
 * o no se invalida al guardar, el admin cambia un precio y las familias siguen
 * viendo el anterior — sin ningún error visible.
 */
describe('ConfigService.getConfig — caché', () => {
  it('con caché fresca no consulta a la base de datos', async () => {
    seedCache('fees', { soci: 30 });

    expect(await ConfigService.getConfig('fees')).toEqual({ soci: 30 });
    expect(mock.queries).toHaveLength(0);
  });

  it('con caché caducada vuelve a consultar', async () => {
    seedCache('fees', { soci: 30 }, TTL_MS + 1000);
    mock.queue('site_config', { data: { value: { soci: 35 } }, error: null });

    expect(await ConfigService.getConfig('fees')).toEqual({ soci: 35 });
    expect(mock.on('site_config')).toHaveLength(1);
  });

  it('justo antes de caducar sigue sirviendo de la caché', async () => {
    seedCache('fees', { soci: 30 }, TTL_MS - 5000);

    expect(await ConfigService.getConfig('fees')).toEqual({ soci: 30 });
    expect(mock.queries).toHaveLength(0);
  });

  it('una caché corrupta no rompe: se ignora y se consulta', async () => {
    localStorage.setItem(CACHE_PREFIX + 'fees', 'esto no es json');
    mock.queue('site_config', { data: { value: { soci: 35 } }, error: null });

    expect(await ConfigService.getConfig('fees')).toEqual({ soci: 35 });
  });

  it('guarda en caché lo que trae de la base de datos', async () => {
    mock.queue('site_config', { data: { value: { soci: 35 } }, error: null });
    await ConfigService.getConfig('fees');

    mock.reset();
    expect(await ConfigService.getConfig('fees')).toEqual({ soci: 35 });
    expect(mock.queries).toHaveLength(0);
  });

  it('lee la fila por su clave', async () => {
    mock.queue('site_config', { data: { value: {} }, error: null });
    await ConfigService.getConfig('branding');

    const [query] = mock.on('site_config');
    expect(query.arg('eq', 'key')).toBe('branding');
    expect(query.first('select')?.[0]).toBe('value');
    expect(query.has('maybeSingle')).toBe(true);
  });

  it('cachea cada clave por separado', async () => {
    seedCache('fees', { soci: 30 });
    mock.queue('site_config', { data: { value: { title: 'Hola' } }, error: null });

    await ConfigService.getConfig('hero');

    expect(await ConfigService.getConfig('fees')).toEqual({ soci: 30 });
    expect(mock.on('site_config')).toHaveLength(1);
  });
});

describe('ConfigService.getConfig — errores', () => {
  it('una clave sin fila devuelve null sin ruido', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.queue('site_config', { data: null, error: null });

    expect(await ConfigService.getConfig('hero')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    expect(localStorage.getItem(CACHE_PREFIX + 'hero')).toBeNull();
  });

  it('devuelve null y deja rastro en consola en vez de romper la página', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.queue('site_config', { data: null, error: { message: 'sin permiso' } });

    expect(await ConfigService.getConfig('fees')).toBeNull();
    expect(spy).toHaveBeenCalled();
  });

  it('un fallo no envenena la caché', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.queue('site_config', { data: null, error: { message: 'sin permiso' } });
    await ConfigService.getConfig('fees');

    expect(localStorage.getItem(CACHE_PREFIX + 'fees')).toBeNull();
  });
});

describe('ConfigService.updateConfig', () => {
  it('escribe el valor y sella la fecha de modificación', async () => {
    await ConfigService.updateConfig('fees', { soci: 40 });

    const [query] = mock.on('site_config');
    const payload = query.first('update')?.[0] as Record<string, unknown>;
    expect(payload.value).toEqual({ soci: 40 });
    expect(payload.updated_at).toEqual(expect.any(String));
    expect(query.arg('eq', 'key')).toBe('fees');
  });

  it('invalida la caché para que la siguiente lectura traiga lo nuevo', async () => {
    seedCache('fees', { soci: 30 });

    await ConfigService.updateConfig('fees', { soci: 40 });

    expect(localStorage.getItem(CACHE_PREFIX + 'fees')).toBeNull();

    mock.reset();
    mock.queue('site_config', { data: { value: { soci: 40 } }, error: null });
    expect(await ConfigService.getConfig('fees')).toEqual({ soci: 40 });
  });

  it('solo invalida la clave tocada', async () => {
    seedCache('fees', { soci: 30 });
    seedCache('hero', { title: 'Hola' });

    await ConfigService.updateConfig('fees', { soci: 40 });

    expect(localStorage.getItem(CACHE_PREFIX + 'hero')).not.toBeNull();
  });

  it('si el guardado falla, lanza y NO invalida la caché', async () => {
    seedCache('fees', { soci: 30 });
    mock.queue('site_config', { data: null, error: { message: 'sin permiso' } });

    await expect(ConfigService.updateConfig('fees', { soci: 40 })).rejects.toEqual({
      message: 'sin permiso',
    });
    expect(localStorage.getItem(CACHE_PREFIX + 'fees')).not.toBeNull();
  });
});

describe('ConfigService.getCachedConfigSync', () => {
  it('devuelve el valor cacheado sin esperar, para el primer render', () => {
    seedCache('branding', { primary: '#0a0' });
    expect(ConfigService.getCachedConfigSync('branding')).toEqual({ primary: '#0a0' });
  });

  it('devuelve null si no hay nada o está caducado', () => {
    expect(ConfigService.getCachedConfigSync('branding')).toBeNull();
    seedCache('branding', { primary: '#0a0' }, TTL_MS + 1);
    expect(ConfigService.getCachedConfigSync('branding')).toBeNull();
  });
});
