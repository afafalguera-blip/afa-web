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
 * What a run of occasional days costs, with the month as a ceiling.
 *
 * Days are charged one by one until they add up to more than the monthly fee;
 * from there the family pays the month and nothing else. Without the cap the
 * arithmetic punished the honest answer: the 7:30-9H slot is 10 €/day against
 * 64 €/month, so a family that ticked the 13 days it really needed was quoted
 * 130 € — twice what the same days cost as a monthly sign-up. `capped` lets the
 * form say so instead of just showing a lower number.
 */
export function occasionalCharge(
  rate: Pick<AcollidaRate, 'preu_soci_mes' | 'preu_soci_ocasional' | 'preu_no_soci_mes' | 'preu_no_soci_ocasional'>,
  isMember: boolean,
  dayCount: number,
): { amount: number; capped: boolean } | null {
  const perDay = unitPrice(rate, isMember, 'ocasional');
  if (perDay == null) return null;

  const raw = perDay * dayCount;
  const month = unitPrice(rate, isMember, 'mensual');
  if (month != null && raw > month) return { amount: month, capped: true };
  return { amount: raw, capped: false };
}

/**
 * What one child costs for a whole month.
 *
 * `ocasional` is charged per day — capped at the monthly fee, see
 * `occasionalCharge` — so without a month to count days in there is no monthly
 * figure to show: the caller gets `null` and shows the day price instead.
 */
export function childMonthlyTotal(
  rate: Pick<AcollidaRate, 'preu_soci_mes' | 'preu_soci_ocasional' | 'preu_no_soci_mes' | 'preu_no_soci_ocasional'>,
  isMember: boolean,
  modality: AcollidaModality,
  occasionalDates: string[] = [],
  month?: number,
  year?: number,
): number | null {
  if (modality === 'mensual') return unitPrice(rate, isMember, 'mensual');
  if (month == null || year == null) return null;
  return occasionalCharge(rate, isMember, datesInMonth(occasionalDates, month, year))?.amount ?? null;
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
