import { describe, expect, it } from 'vitest';
import { childMonthlyTotal, datesInMonth, unitPrice } from '../logic/acollidaPricing';
import { rosterByWeekday, weekdayOfIsoDate } from '../logic/acollidaRoster';
import type { AcollidaInscription } from '../types/acollida';

/** The real "7:30H A 9H" row, which is what production charges. */
const rate = {
  preu_soci_mes: 64,
  preu_soci_ocasional: 10,
  preu_no_soci_mes: 68,
  preu_no_soci_ocasional: 14,
};

const inscription = (over: Partial<AcollidaInscription> = {}): AcollidaInscription => ({
  id: over.id ?? 'id-1',
  created_at: '2026-09-01T08:00:00Z',
  updated_at: '2026-09-01T08:00:00Z',
  academic_year: '2026-27',
  child_name: 'Jan',
  child_surname: 'Puig',
  course: 'I3',
  rate_id: 'rate-1',
  modality: 'mensual',
  weekdays: [1, 3],
  occasional_dates: [],
  start_month: 9,
  start_year: 2026,
  parent_name: 'Marta Puig',
  parent_email: 'marta@example.com',
  parent_phone: '600000000',
  afa_member: true,
  notes: null,
  status: 'confirmada',
  form_language: 'ca',
  ...over,
});

describe('unitPrice', () => {
  it('charges the member rate to members and the other one to everybody else', () => {
    expect(unitPrice(rate, true, 'mensual')).toBe(64);
    expect(unitPrice(rate, false, 'mensual')).toBe(68);
    expect(unitPrice(rate, true, 'ocasional')).toBe(10);
    expect(unitPrice(rate, false, 'ocasional')).toBe(14);
  });

  it('returns null when the slot has no occasional price, instead of falling back to the monthly one', () => {
    const monthlyOnly = { ...rate, preu_soci_ocasional: null, preu_no_soci_ocasional: null };
    expect(unitPrice(monthlyOnly, true, 'ocasional')).toBeNull();
  });
});

describe('datesInMonth', () => {
  it('counts only the dates of that month', () => {
    const dates = ['2026-06-08', '2026-06-19', '2026-07-01'];
    expect(datesInMonth(dates, 6, 2026)).toBe(2);
    expect(datesInMonth(dates, 7, 2026)).toBe(1);
    expect(datesInMonth(dates, 6, 2025)).toBe(0);
  });
});

describe('childMonthlyTotal', () => {
  it('bills a monthly sign-up once, whatever days it uses', () => {
    expect(childMonthlyTotal(rate, true, 'mensual')).toBe(64);
  });

  it('bills an occasional sign-up per day of that month', () => {
    const dates = ['2026-06-08', '2026-06-09', '2026-07-02'];
    expect(childMonthlyTotal(rate, true, 'ocasional', dates, 6, 2026)).toBe(20);
    expect(childMonthlyTotal(rate, false, 'ocasional', dates, 7, 2026)).toBe(14);
  });

  it('has no monthly figure for an occasional sign-up without a month to count in', () => {
    expect(childMonthlyTotal(rate, true, 'ocasional', ['2026-06-08'])).toBeNull();
  });
});

describe('weekdayOfIsoDate', () => {
  it('maps a date to monday..friday', () => {
    expect(weekdayOfIsoDate('2026-06-08')).toBe(1); // dilluns
    expect(weekdayOfIsoDate('2026-06-12')).toBe(5); // divendres
  });

  it('ignores weekends: there is no service', () => {
    expect(weekdayOfIsoDate('2026-06-13')).toBeNull();
    expect(weekdayOfIsoDate('2026-06-14')).toBeNull();
  });
});

describe('rosterByWeekday', () => {
  it('puts a monthly sign-up on every weekday it chose', () => {
    const roster = rosterByWeekday([inscription({ weekdays: [1, 3] })]);
    expect(roster[1]).toHaveLength(1);
    expect(roster[2]).toHaveLength(0);
    expect(roster[3]).toHaveLength(1);
  });

  it('places an occasional sign-up on the weekday of each booked date', () => {
    const roster = rosterByWeekday([
      inscription({ modality: 'ocasional', weekdays: [], occasional_dates: ['2026-06-08', '2026-06-12'] }),
    ]);
    expect(roster[1][0].date).toBe('2026-06-08');
    expect(roster[5][0].date).toBe('2026-06-12');
  });

  it('leaves out the occasional dates of another month when a month is given', () => {
    const roster = rosterByWeekday(
      [inscription({ modality: 'ocasional', weekdays: [], occasional_dates: ['2026-06-08', '2026-07-06'] })],
      { month: 6, year: 2026 },
    );
    expect(roster[1]).toHaveLength(1);
  });

  it('sorts each day by child, so the printed list reads like a class list', () => {
    const roster = rosterByWeekday([
      inscription({ id: 'a', child_name: 'Zoe', child_surname: 'Alsina', weekdays: [2] }),
      inscription({ id: 'b', child_name: 'Ada', child_surname: 'Bosch', weekdays: [2] }),
    ]);
    expect(roster[2].map((e) => e.inscription.child_name)).toEqual(['Ada', 'Zoe']);
  });
});
