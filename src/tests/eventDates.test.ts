import { describe, expect, it } from 'vitest';
import {
  eventCoversDate,
  eventDayCount,
  eventEndDate,
  eventSegment,
  isMultiDay,
  monthRange,
  toLocalISODate,
} from '../utils/eventDates';

/**
 * Estas pruebas fijan el fallo que hacía que los eventos del 30 de abril
 * desaparecieran del calendario de abril y aparecieran en el de mayo: el rango
 * del mes se calculaba con toISOString(), que pasa por UTC y retrocede un día
 * en las zonas al este de Greenwich.
 */
describe('monthRange', () => {
  it('cubre el mes completo, sin perder el último día', () => {
    // Mayo tiene 31 días; el bug devolvía "hasta el 30".
    expect(monthRange(new Date(2027, 4, 15))).toEqual({
      from: '2027-05-01',
      to: '2027-05-31',
    });
  });

  it('no arrastra el último día del mes anterior', () => {
    // El bug devolvía from = '2027-04-30' para mayo.
    expect(monthRange(new Date(2027, 4, 1)).from).toBe('2027-05-01');
  });

  it('incluye el 30 de abril dentro de abril', () => {
    // El bug devolvía to = '2027-04-29', dejando fuera el día 30.
    const abril = monthRange(new Date(2027, 3, 10));
    expect(abril).toEqual({ from: '2027-04-01', to: '2027-04-30' });
    expect('2027-04-30' <= abril.to).toBe(true);
  });

  it('resuelve febrero bisiesto y no bisiesto', () => {
    expect(monthRange(new Date(2028, 1, 5)).to).toBe('2028-02-29');
    expect(monthRange(new Date(2027, 1, 5)).to).toBe('2027-02-28');
  });

  it('cruza el cambio de año', () => {
    expect(monthRange(new Date(2027, 11, 20))).toEqual({
      from: '2027-12-01',
      to: '2027-12-31',
    });
  });
});

describe('toLocalISODate', () => {
  it('usa la fecha civil local, no la UTC', () => {
    // Medianoche local: toISOString() daría el día anterior en UTC+X.
    expect(toLocalISODate(new Date(2027, 4, 1, 0, 0, 0))).toBe('2027-05-01');
  });

  it('rellena mes y día con dos dígitos', () => {
    expect(toLocalISODate(new Date(2027, 0, 9))).toBe('2027-01-09');
  });
});

describe('rangos de evento', () => {
  const unDia = { event_date: '2027-05-17', end_date: '2027-05-17' };
  const semanaSanta = { event_date: '2027-03-27', end_date: '2027-04-05' };
  const legacy = { event_date: '2027-05-17', end_date: null };

  it('trata end_date nulo como evento de un día', () => {
    expect(eventEndDate(legacy)).toBe('2027-05-17');
    expect(isMultiDay(legacy)).toBe(false);
    expect(eventDayCount(legacy)).toBe(1);
  });

  it('detecta los eventos de varios días', () => {
    expect(isMultiDay(unDia)).toBe(false);
    expect(isMultiDay(semanaSanta)).toBe(true);
    expect(eventDayCount(semanaSanta)).toBe(10);
  });

  it('cubre todos los días del rango, extremos incluidos', () => {
    expect(eventCoversDate(semanaSanta, '2027-03-27')).toBe(true);
    expect(eventCoversDate(semanaSanta, '2027-03-31')).toBe(true);
    expect(eventCoversDate(semanaSanta, '2027-04-05')).toBe(true);
    expect(eventCoversDate(semanaSanta, '2027-03-26')).toBe(false);
    expect(eventCoversDate(semanaSanta, '2027-04-06')).toBe(false);
  });

  it('marca inicio y fin para dibujar la barra continua', () => {
    expect(eventSegment(semanaSanta, '2027-03-27')).toEqual({ isStart: true, isEnd: false });
    expect(eventSegment(semanaSanta, '2027-03-30')).toEqual({ isStart: false, isEnd: false });
    expect(eventSegment(semanaSanta, '2027-04-05')).toEqual({ isStart: false, isEnd: true });
  });

  it('un evento a caballo de dos meses entra en ambos', () => {
    const marzo = monthRange(new Date(2027, 2, 1));
    const abril = monthRange(new Date(2027, 3, 1));
    const solapa = (r: { from: string; to: string }) =>
      semanaSanta.event_date <= r.to && eventEndDate(semanaSanta) >= r.from;

    expect(solapa(marzo)).toBe(true);
    expect(solapa(abril)).toBe(true);
  });
});
