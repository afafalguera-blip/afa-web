/**
 * The month grid the occasional-days picker draws.
 *
 * Five columns, monday to friday: the acollida does not open at the weekend, so
 * a saturday cell would only be there to be un-clickable. Days already gone are
 * kept in the grid — removing them would shift the columns and make the month
 * unreadable — but marked `past` so the picker can refuse them.
 */

export interface CalendarCell {
  /** yyyy-mm-dd, the same shape stored in `occasional_dates`. */
  iso: string;
  /** Day of the month, 1..31. */
  day: number;
  past: boolean;
}

/** yyyy-mm-dd for a local date, without the UTC shift `toISOString()` adds. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `month` is 1-based, as everywhere else in the acollida code. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = month - 1 + delta;
  return {
    year: year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  };
}

/**
 * Weeks of the month as rows of five cells (mon..fri). `null` pads the first and
 * last week so every column really is the same weekday all the way down.
 */
export function monthMatrix(year: number, month: number, today: Date): (CalendarCell | null)[][] {
  const todayIso = toIsoDate(today);
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (CalendarCell | null)[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay(); // 0 sunday .. 6 saturday
    if (weekday === 0 || weekday === 6) continue;

    // Pad the first week so monday lands in the first column.
    if (cells.length === 0) {
      for (let i = 1; i < weekday; i += 1) cells.push(null);
    }

    const iso = toIsoDate(date);
    cells.push({ iso, day, past: iso < todayIso });
  }

  while (cells.length % 5 !== 0) cells.push(null);

  const rows: (CalendarCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 5) rows.push(cells.slice(i, i + 5));
  return rows;
}

/**
 * Working days (mon-fri) between two ISO dates, both included.
 *
 * Used to turn "the Christmas break" into the days it really is. Weekends are
 * dropped because nothing is ever scheduled on them, and a list full of
 * saturdays hides the days somebody has to check.
 */
export function workingDaysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);

  while (cursor <= end) {
    const weekday = cursor.getDay();
    if (weekday >= 1 && weekday <= 5) days.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}
