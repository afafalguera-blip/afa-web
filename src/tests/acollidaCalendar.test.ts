import { describe, expect, it } from 'vitest';
import { monthMatrix, shiftMonth, toIsoDate, workingDaysBetween } from '../logic/acollidaCalendar';

const TODAY = new Date(2026, 9, 15); // 15 October 2026

describe('toIsoDate', () => {
  it('keeps the local day, unlike toISOString', () => {
    // Late-evening dates in CEST roll over to the next day in UTC.
    expect(toIsoDate(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05');
  });
});

describe('shiftMonth', () => {
  it('walks forwards and backwards across the year boundary', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 9, 4)).toEqual({ year: 2027, month: 1 });
  });
});

describe('monthMatrix', () => {
  const rows = monthMatrix(2026, 10, TODAY);
  const cells = rows.flat().filter((c) => c !== null);

  it('leaves out weekends: October 2026 has 22 working days', () => {
    expect(cells).toHaveLength(22);
    expect(cells.some((c) => c!.iso === '2026-10-03')).toBe(false); // saturday
  });

  it('lines every column up with its weekday', () => {
    // 1 October 2026 is a thursday, so the first row starts with three gaps.
    expect(rows[0].slice(0, 3)).toEqual([null, null, null]);
    expect(rows[0][3]?.iso).toBe('2026-10-01');
    expect(rows.every((week) => week.length === 5)).toBe(true);
  });

  it('marks days already gone, today included as bookable', () => {
    const byIso = new Map(cells.map((c) => [c!.iso, c!]));
    expect(byIso.get('2026-10-14')?.past).toBe(true);
    expect(byIso.get('2026-10-15')?.past).toBe(false);
    expect(byIso.get('2026-10-16')?.past).toBe(false);
  });

  it('handles a month that starts on a monday without padding', () => {
    const june = monthMatrix(2026, 6, TODAY);
    expect(june[0][0]?.iso).toBe('2026-06-01');
  });
});

describe('workingDaysBetween', () => {
  it('turns a holiday range into the days it really is', () => {
    // The christmas break as a calendar states it: 23 December to 7 January.
    const days = workingDaysBetween('2026-12-23', '2027-01-07');
    // Seven working days in December (23, 24, 25, 28, 29, 30, 31) and five in
    // January (1, 4, 5, 6, 7).
    expect(days).toHaveLength(12);
    expect(days[0]).toBe('2026-12-23');
    expect(days.at(-1)).toBe('2027-01-07');
    expect(days).not.toContain('2026-12-26'); // saturday
    expect(days).not.toContain('2026-12-27'); // sunday
  });

  it('keeps a single working day and drops a single weekend one', () => {
    expect(workingDaysBetween('2026-11-02', '2026-11-02')).toEqual(['2026-11-02']);
    expect(workingDaysBetween('2026-11-07', '2026-11-08')).toEqual([]);
  });

  it('returns nothing when the range runs backwards', () => {
    expect(workingDaysBetween('2026-12-10', '2026-12-01')).toEqual([]);
  });
});
