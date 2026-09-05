/**
 * Reading the occupancy the database sends back.
 *
 * The arithmetic of "is this day full" lives in SQL — `acollida_occupancy()` is
 * the only place that decides it, so the public form, the admin screen and the
 * trigger that guards a confirmation can never disagree. What is left here is
 * what a screen needs on top of those rows: which weekdays a monthly sign-up
 * can still choose, and how close to full a day is.
 */

import type { AcollidaOccupancyDay, AcollidaWeekday } from '../types/acollida';
import { ACOLLIDA_WEEKDAYS } from '../types/acollida';
import { weekdayOfIsoDate } from './acollidaRoster';

/** How full a day is, for a colour: plenty of room, nearly full, or full. */
export type OccupancyLevel = 'free' | 'tight' | 'full';

/** `tight` starts at 80% — the point where the AFA still has time to react. */
export function occupancyLevel(day: Pick<AcollidaOccupancyDay, 'total' | 'seats'>): OccupancyLevel {
  if (day.seats <= 0) return 'free';
  if (day.total >= day.seats) return 'full';
  return day.total / day.seats >= 0.8 ? 'tight' : 'free';
}

/**
 * Weekdays a monthly sign-up can still take.
 *
 * A monthly place repeats every week, so one full tuesday in the horizon is
 * enough to rule tuesdays out: promising a place that only exists three weeks
 * out of four is how a family ends up at the door with nowhere to leave a child.
 */
export function availableWeekdays(fullDates: string[]): AcollidaWeekday[] {
  const blocked = new Set<AcollidaWeekday>();

  for (const iso of fullDates) {
    const weekday = weekdayOfIsoDate(iso);
    if (weekday) blocked.add(weekday);
  }

  return ACOLLIDA_WEEKDAYS.filter((day) => !blocked.has(day));
}

/** The dates with no seat left, ready to hand to the calendar. */
export function fullDates(days: AcollidaOccupancyDay[]): string[] {
  return days.filter((day) => day.free <= 0).map((day) => day.day);
}
