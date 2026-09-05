/**
 * Acollida pricing — the ONE place a price is decided on the client.
 *
 * It mirrors `acollida_price_for()` / `generate_acollida_payments()` in
 * 20260905120000_acollida_module.sql on purpose: the family must see on the
 * sign-up form exactly the amount the AFA will later put on the receipt. If the
 * SQL changes, this changes with it (and `src/tests/acollidaPricing.test.ts`
 * pins the two together).
 */

import type { AcollidaRate, AcollidaModality } from '../types/acollida';

/** Price of one unit: a month for `mensual`, a single day for `ocasional`. */
export function unitPrice(
  rate: Pick<AcollidaRate, 'preu_soci_mes' | 'preu_soci_ocasional' | 'preu_no_soci_mes' | 'preu_no_soci_ocasional'>,
  isMember: boolean,
  modality: AcollidaModality,
): number | null {
  if (modality === 'ocasional') {
    return isMember ? rate.preu_soci_ocasional : rate.preu_no_soci_ocasional;
  }
  return isMember ? rate.preu_soci_mes : rate.preu_no_soci_mes;
}

/** How many of `dates` (yyyy-mm-dd) fall in the given month. `month` is 1-based. */
export function datesInMonth(dates: string[], month: number, year: number): number {
  return dates.filter((iso) => {
    const [y, m] = iso.split('-').map(Number);
    return y === year && m === month;
  }).length;
}

/**
 * What one child costs for a whole month.
 *
 * `ocasional` is charged per day, so without a month to count days in there is
 * no monthly figure to show — the caller gets `null` and shows the day price
 * instead.
 */
export function childMonthlyTotal(
  rate: Pick<AcollidaRate, 'preu_soci_mes' | 'preu_soci_ocasional' | 'preu_no_soci_mes' | 'preu_no_soci_ocasional'>,
  isMember: boolean,
  modality: AcollidaModality,
  occasionalDates: string[] = [],
  month?: number,
  year?: number,
): number | null {
  const unit = unitPrice(rate, isMember, modality);
  if (unit == null) return null;
  if (modality === 'mensual') return unit;
  if (month == null || year == null) return null;
  return unit * datesInMonth(occasionalDates, month, year);
}

const EURO = new Intl.NumberFormat('ca-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** "64 €", "4,5 €". Used everywhere a price is shown, public side and admin. */
export function formatEuro(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return EURO.format(amount);
}
