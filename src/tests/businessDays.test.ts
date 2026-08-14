import { describe, it, expect } from 'vitest';
import { businessDaysBetween, decidirAviso } from '../../supabase/functions/_shared/businessDays';

// Esta lógica decide si a las 7 de la mañana sale un correo sin nadie delante.
// Si se equivoca por exceso, el aviso se convierte en ruido y deja de leerse;
// si se equivoca por defecto, la web puede estar caída para las familias sin
// que nadie se entere. Por eso está fuera de la Edge Function y con tests.

const UMBRAL = 5;
const SILENCIO = 7;

describe('businessDaysBetween', () => {
  it('no cuenta el fin de semana', () => {
    // Viernes 2026-08-07 -> lunes 2026-08-10: sábado y domingo no cuentan.
    expect(businessDaysBetween(new Date('2026-08-07T10:00:00Z'), new Date('2026-08-10T10:00:00Z'))).toBe(1);
  });

  it('una semana natural son cinco laborables', () => {
    expect(businessDaysBetween(new Date('2026-08-03T08:00:00Z'), new Date('2026-08-10T08:00:00Z'))).toBe(5);
  });

  it('no depende de la hora a la que corra el cron', () => {
    const temprano = businessDaysBetween(new Date('2026-08-03T00:05:00Z'), new Date('2026-08-10T06:00:00Z'));
    const tarde = businessDaysBetween(new Date('2026-08-03T23:55:00Z'), new Date('2026-08-10T22:00:00Z'));
    expect(temprano).toBe(tarde);
  });

  it('devuelve 0 si el fin es anterior o igual al inicio', () => {
    expect(businessDaysBetween(new Date('2026-08-10T10:00:00Z'), new Date('2026-08-03T10:00:00Z'))).toBe(0);
    expect(businessDaysBetween(new Date('2026-08-10T10:00:00Z'), new Date('2026-08-10T10:00:00Z'))).toBe(0);
  });

  it('un fin de semana entero no suma ni un laborable', () => {
    // Viernes noche -> domingo noche.
    expect(businessDaysBetween(new Date('2026-08-07T20:00:00Z'), new Date('2026-08-09T20:00:00Z'))).toBe(0);
  });

  it('aguanta fechas inválidas sin lanzar', () => {
    expect(businessDaysBetween(new Date('no es una fecha'), new Date('2026-08-10T10:00:00Z'))).toBe(0);
  });
});

describe('decidirAviso', () => {
  const base = { umbralLaborables: UMBRAL, silencioDias: SILENCIO };

  it('avisa tras cinco laborables sin señal', () => {
    const r = decidirAviso({
      ...base,
      ahora: new Date('2026-08-10T07:00:00Z'), // lunes
      ultimaActividad: new Date('2026-08-03T07:00:00Z'), // lunes anterior
      ultimoAviso: null,
    });
    expect(r.avisar).toBe(true);
    expect(r.laborablesSinActividad).toBe(5);
  });

  it('el lunes por la mañana, tras un fin de semana normal, NO avisa', () => {
    // El fallo clásico: contar días naturales haría saltar el aviso cada lunes.
    const r = decidirAviso({
      ...base,
      ahora: new Date('2026-08-10T07:00:00Z'), // lunes
      ultimaActividad: new Date('2026-08-07T18:00:00Z'), // viernes
      ultimoAviso: null,
    });
    expect(r.avisar).toBe(false);
    expect(r.laborablesSinActividad).toBe(1);
  });

  it('no repite el aviso al día siguiente mientras dura el parón', () => {
    const r = decidirAviso({
      ...base,
      ahora: new Date('2026-08-11T07:00:00Z'),
      ultimaActividad: new Date('2026-08-03T07:00:00Z'),
      ultimoAviso: new Date('2026-08-10T07:00:00Z'),
    });
    expect(r.avisar).toBe(false);
    expect(r.motivo).toBe('ya se avisó hace poco');
  });

  it('vuelve a avisar si el parón sigue una semana después', () => {
    const r = decidirAviso({
      ...base,
      ahora: new Date('2026-08-17T07:00:00Z'),
      ultimaActividad: new Date('2026-08-03T07:00:00Z'),
      ultimoAviso: new Date('2026-08-10T07:00:00Z'),
    });
    expect(r.avisar).toBe(true);
  });

  it('una base sin ninguna actividad registrada no dispara nada', () => {
    // Entorno recién creado o consulta que ha fallado: avisar sería ruido.
    const r = decidirAviso({ ...base, ahora: new Date('2026-08-10T07:00:00Z'), ultimaActividad: null, ultimoAviso: null });
    expect(r.avisar).toBe(false);
    expect(r.motivo).toBe('sin datos de actividad');
  });
});
