import { describe, expect, it } from 'vitest';
import { coverageLevel, coveragePercent, placesToBreakEven } from '../logic/acollidaCoverage';

// The real morning room: 500 € a month, fixed, whoever turns up.
const cost = 500;

describe('coverageLevel', () => {
  it('is covered from the euro that reaches the cost', () => {
    expect(coverageLevel({ revenue: 499, monthly_cost: cost })).toBe('close');
    expect(coverageLevel({ revenue: 500, monthly_cost: cost })).toBe('covered');
    expect(coverageLevel({ revenue: 640, monthly_cost: cost })).toBe('covered');
  });

  it('warns while there is still time to react', () => {
    expect(coverageLevel({ revenue: 399, monthly_cost: cost })).toBe('short');
    expect(coverageLevel({ revenue: 400, monthly_cost: cost })).toBe('close');
  });

  it('says nothing when nobody has entered the cost', () => {
    expect(coverageLevel({ revenue: 0, monthly_cost: 0 })).toBe('unset');
  });
});

describe('coveragePercent', () => {
  it('rounds to something sayable out loud', () => {
    expect(coveragePercent({ revenue: 320, monthly_cost: cost })).toBe(64);
    expect(coveragePercent({ revenue: 27, monthly_cost: cost })).toBe(5);
  });

  it('does not divide by a cost nobody set', () => {
    expect(coveragePercent({ revenue: 100, monthly_cost: 0 })).toBe(0);
  });
});

describe('placesToBreakEven', () => {
  it('answers in whole children, rounding up', () => {
    // 64 € is the member fee for 7:30-9H: eight of them cover the 500 €.
    expect(placesToBreakEven({ revenue: 0, monthly_cost: cost }, 64)).toBe(8);
    expect(placesToBreakEven({ revenue: 320, monthly_cost: cost }, 64)).toBe(3);
  });

  it('is zero once the month pays for itself', () => {
    expect(placesToBreakEven({ revenue: 500, monthly_cost: cost }, 64)).toBe(0);
    expect(placesToBreakEven({ revenue: 700, monthly_cost: cost }, 64)).toBe(0);
  });

  it('refuses to divide by a price of zero', () => {
    expect(placesToBreakEven({ revenue: 0, monthly_cost: cost }, 0)).toBe(0);
  });
});
