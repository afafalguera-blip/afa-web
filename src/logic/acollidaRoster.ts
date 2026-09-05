/**
 * Per-day roster: the listing the monitors actually ask for ("who do I have on
 * Tuesday"). Pure, so it can be tested without a database.
 *
 * A `mensual` sign-up contributes to every weekday it selected. An `ocasional`
 * one contributes to the weekday of each date it booked, which is why the
 * weekday has to be derived from the date and not asked again on the form.
 */

import { ACOLLIDA_WEEKDAYS, type AcollidaInscription, type AcollidaWeekday } from '../types/acollida';

/** Monday = 1 … Friday = 5. Weekend dates return null (no service). */
export function weekdayOfIsoDate(iso: string): AcollidaWeekday | null {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  // Midday UTC: sidesteps the timezone shift that can move a date one day back.
  const day = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return day >= 1 && day <= 5 ? (day as AcollidaWeekday) : null;
}

export interface RosterEntry {
  inscription: AcollidaInscription;
  /** Set for occasional sign-ups: the concrete day this entry comes from. */
  date?: string;
}

export type Roster = Record<AcollidaWeekday, RosterEntry[]>;

const emptyRoster = (): Roster =>
  ACOLLIDA_WEEKDAYS.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {} as Roster);

/**
 * @param rows        sign-ups to place, already filtered by the caller
 * @param monthFilter optional {month (1-based), year}: occasional dates outside
 *                    it are ignored, so "the June roster" doesn't drag in May
 */
export function rosterByWeekday(
  rows: AcollidaInscription[],
  monthFilter?: { month: number; year: number },
): Roster {
  const roster = emptyRoster();

  for (const row of rows) {
    if (row.modality === 'mensual') {
      for (const day of row.weekdays) {
        if (roster[day]) roster[day].push({ inscription: row });
      }
      continue;
    }

    for (const date of row.occasional_dates) {
      if (monthFilter) {
        const [y, m] = date.split('-').map(Number);
        if (y !== monthFilter.year || m !== monthFilter.month) continue;
      }
      const day = weekdayOfIsoDate(date);
      if (day) roster[day].push({ inscription: row, date });
    }
  }

  const byChild = (a: RosterEntry, b: RosterEntry) =>
    `${a.inscription.child_name} ${a.inscription.child_surname}`.localeCompare(
      `${b.inscription.child_name} ${b.inscription.child_surname}`,
      'ca',
      { sensitivity: 'base' },
    );

  for (const day of ACOLLIDA_WEEKDAYS) roster[day].sort(byChild);

  return roster;
}
