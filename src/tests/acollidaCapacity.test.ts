import { describe, expect, it } from 'vitest';
import { availableWeekdays, fullDates, occupancyLevel } from '../logic/acollidaCapacity';
import type { AcollidaOccupancyDay } from '../types/acollida';

const day = (over: Partial<AcollidaOccupancyDay> = {}): AcollidaOccupancyDay => ({
  day: '2026-10-01',
  capacity_group: 'mati',
  monthly: 0,
  occasional: 0,
  total: 0,
  seats: 10,
  free: 10,
  ...over,
});

describe('occupancyLevel', () => {
  it('warns before the room is full, not when it already is', () => {
    expect(occupancyLevel({ total: 7, seats: 10 })).toBe('free');
    expect(occupancyLevel({ total: 8, seats: 10 })).toBe('tight');
    expect(occupancyLevel({ total: 10, seats: 10 })).toBe('full');
  });

  it('counts an overbooked day as full, never as free', () => {
    expect(occupancyLevel({ total: 12, seats: 10 })).toBe('full');
  });

  it('treats a room with no declared seats as unrestricted', () => {
    expect(occupancyLevel({ total: 30, seats: 0 })).toBe('free');
  });
});

describe('availableWeekdays', () => {
  it('leaves every weekday open when nothing is full', () => {
    expect(availableWeekdays([])).toEqual([1, 2, 3, 4, 5]);
  });

  it('rules out a weekday as soon as ONE of its days is full', () => {
    // 2026-10-13 is a tuesday. A monthly place comes every tuesday, so one full
    // tuesday is enough to make the whole weekday impossible.
    expect(availableWeekdays(['2026-10-13'])).toEqual([1, 3, 4, 5]);
  });

  it('rules out several weekdays at once and ignores weekend dates', () => {
    expect(availableWeekdays(['2026-10-05', '2026-10-09', '2026-10-10'])).toEqual([2, 3, 4]);
  });
});

describe('fullDates', () => {
  it('keeps only the days with no seat left', () => {
    const days = [
      day({ day: '2026-10-01', free: 3, total: 7 }),
      day({ day: '2026-10-02', free: 0, total: 10 }),
      day({ day: '2026-10-05', free: 0, total: 11 }),
    ];
    expect(fullDates(days)).toEqual(['2026-10-02', '2026-10-05']);
  });
});
