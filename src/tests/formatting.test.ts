import { describe, expect, it } from 'vitest';
import { fromDateTimeLocalInputValue, toDateTimeLocalInputValue } from '../utils/dateTime';
import { getRegionalLanguageTag } from '../utils/locale';
import { proxyStorageUrl } from '../utils/storageUrl';
import { makeContentResolver, pickLang } from '../utils/inscriptionContent';
import type { InscriptionContentBlock } from '../services/ConfigService';

describe('proxyStorageUrl', () => {
  it('reescribe las urls de Supabase Storage al proxy de Vercel', () => {
    expect(
      proxyStorageUrl(
        'https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/public/Imagenes/logo.png',
      ),
    ).toBe('/storage/object/public/Imagenes/logo.png');
  });

  it('deja intactas las urls externas', () => {
    expect(proxyStorageUrl('https://cdn.test/a.png')).toBe('https://cdn.test/a.png');
  });

  it('devuelve cadena vacía para nulos', () => {
    expect(proxyStorageUrl(null)).toBe('');
    expect(proxyStorageUrl(undefined)).toBe('');
    expect(proxyStorageUrl('')).toBe('');
  });
});

describe('getRegionalLanguageTag', () => {
  it.each([
    ['ca', 'ca-ES'],
    ['es', 'es-ES'],
    ['en', 'en-GB'],
    ['ca-ES', 'ca-ES'],
    ['EN-US', 'en-GB'],
  ])('mapea %s a %s', (input, expected) => {
    expect(getRegionalLanguageTag(input)).toBe(expected);
  });

  it('cae a es-ES con idioma desconocido o vacío', () => {
    expect(getRegionalLanguageTag('fr')).toBe('es-ES');
    expect(getRegionalLanguageTag(null)).toBe('es-ES');
    expect(getRegionalLanguageTag(undefined)).toBe('es-ES');
  });
});

describe('dateTime (input datetime-local)', () => {
  it('hace ida y vuelta sin desplazar la hora', () => {
    const iso = '2026-03-15T18:30:00.000Z';
    expect(fromDateTimeLocalInputValue(toDateTimeLocalInputValue(iso))).toBe(iso);
  });

  it('produce el formato que espera el input (sin segundos ni zona)', () => {
    expect(toDateTimeLocalInputValue('2026-03-15T18:30:00.000Z')).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    );
  });

  it('devuelve vacío con entrada nula o inválida', () => {
    expect(toDateTimeLocalInputValue(null)).toBe('');
    expect(toDateTimeLocalInputValue(undefined)).toBe('');
    expect(toDateTimeLocalInputValue('no es una fecha')).toBe('');
  });

  it('devuelve null cuando el input está vacío o es inválido', () => {
    expect(fromDateTimeLocalInputValue('')).toBeNull();
    expect(fromDateTimeLocalInputValue('no es una fecha')).toBeNull();
  });
});

describe('makeContentResolver', () => {
  const t = (key: string) => `i18n:${key}`;

  it('prefiere el texto configurado por el admin', () => {
    const block: InscriptionContentBlock = { info_box_title: 'Títol propi' };
    expect(makeContentResolver(block, t)('info_box_title', 'inscription.title')).toBe('Títol propi');
  });

  it('cae a la traducción si el campo está vacío o solo tiene espacios', () => {
    const block: InscriptionContentBlock = { info_box_title: '   ' };
    expect(makeContentResolver(block, t)('info_box_title', 'inscription.title')).toBe(
      'i18n:inscription.title',
    );
  });

  it('cae a la traducción si no hay bloque configurado', () => {
    expect(makeContentResolver(undefined, t)('info_box_title', 'inscription.title')).toBe(
      'i18n:inscription.title',
    );
  });
});

describe('pickLang', () => {
  const byLang = { ca: 'CAT', es: 'CAS', en: 'ENG' };

  it('devuelve el valor del idioma activo', () => {
    expect(pickLang(byLang, 'es')).toBe('CAS');
    expect(pickLang(byLang, 'en')).toBe('ENG');
  });

  it('cae al catalán con un idioma no soportado', () => {
    expect(pickLang(byLang, 'fr')).toBe('CAT');
  });
});
