import { describe, expect, it } from 'vitest';
import { COURSES, COURSE_BY_CODE, COURSE_CODES, isCourseCode } from '../constants/courses';
import { classifyGroup } from '../utils/courseStage';
import { activityPath, slugify } from '../utils/slug';

/**
 * Los códigos de curso son la clave con la que se guardan las inscripciones y
 * con la que los generadores de pagos calculan precios: renombrar uno sin
 * migrar datos deja recibos huérfanos.
 */
describe('COURSE_CODES', () => {
  it('mantiene los 9 códigos y su orden', () => {
    expect(COURSE_CODES).toEqual(['I3', 'I4', 'I5', '1PRI', '2PRI', '3PRI', '4PRI', '5PRI', '6PRI']);
  });

  it('tiene una entrada por código, sin duplicados', () => {
    expect(COURSES).toHaveLength(COURSE_CODES.length);
    expect(new Set(COURSES.map(c => c.code)).size).toBe(COURSE_CODES.length);
  });

  it('indexa cada curso por su código', () => {
    for (const code of COURSE_CODES) {
      expect(COURSE_BY_CODE[code].code).toBe(code);
    }
  });

  it('asigna etapa infantil solo a I3-I5', () => {
    expect(COURSES.filter(c => c.stage === 'infantil').map(c => c.code)).toEqual(['I3', 'I4', 'I5']);
  });

  it('da a cada curso una clave i18n propia', () => {
    expect(new Set(COURSES.map(c => c.i18nKey)).size).toBe(COURSES.length);
  });

  it('valida códigos con isCourseCode', () => {
    expect(isCourseCode('1PRI')).toBe(true);
    expect(isCourseCode('1pri')).toBe(false);
    expect(isCourseCode('7PRI')).toBe(false);
  });
});

describe('classifyGroup', () => {
  it.each([
    ['Ed. infantil', 'infantil'],
    ['INFANTIL', 'infantil'],
    ['1r-3r', 'primaria1'],
    ['1 a 3', 'primaria1'],
    ['2n de primària', 'primaria1'],
    ['4t-6è', 'primaria2'],
    ['4 a 6', 'primaria2'],
    ['5è primària', 'primaria2'],
  ])('clasifica %s como %s', (label, expected) => {
    expect(classifyGroup(label)).toBe(expected);
  });

  it('devuelve null cuando no puede clasificar', () => {
    expect(classifyGroup('Grup obert')).toBeNull();
    expect(classifyGroup('')).toBeNull();
  });
});

describe('slugify / activityPath', () => {
  it('genera slugs sin acentos ni signos', () => {
    expect(slugify('Patinatge artístic (nivell 2)')).toBe('patinatge-artistic-nivell-2');
  });

  it('no deja guiones al principio ni al final', () => {
    expect(slugify('  ¡Anglès!  ')).toBe('angles');
  });

  it('devuelve cadena vacía si no queda nada útil', () => {
    expect(slugify('###')).toBe('');
    expect(slugify('')).toBe('');
  });

  it('construye la url pública con id y slug', () => {
    expect(activityPath({ id: 7, title: 'Anglès' })).toBe('/extraescolars/7/angles');
  });

  it('cae a la url sin slug cuando el título no aporta nada', () => {
    expect(activityPath({ id: 7, title: '###' })).toBe('/extraescolars/7');
    expect(activityPath({ id: 7 })).toBe('/extraescolars/7');
  });
});
