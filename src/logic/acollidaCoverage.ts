/**
 * Does this month pay for itself?
 *
 * The morning monitoring costs a fixed 500 € whether ten children come or two,
 * so the useful question is never "how many places are left" but "does what is
 * confirmed cover what it costs". These helpers turn the database's figures
 * into the two sentences a treasurer actually says out loud: how far off the
 * month is, and how many more monthly places would close the gap.
 */

export interface Coverage {
  capacity_group: string;
  confirmed: number;
  revenue: number;
  monthly_cost: number;
}

export type CoverageLevel = 'covered' | 'close' | 'short' | 'unset';

/** `close` starts at 80%: still short, but within reach of a couple of places. */
export function coverageLevel(row: Pick<Coverage, 'revenue' | 'monthly_cost'>): CoverageLevel {
  if (row.monthly_cost <= 0) return 'unset';
  if (row.revenue >= row.monthly_cost) return 'covered';
  return row.revenue / row.monthly_cost >= 0.8 ? 'close' : 'short';
}

/** Percentage of the cost already covered, rounded, never negative. */
export function coveragePercent(row: Pick<Coverage, 'revenue' | 'monthly_cost'>): number {
  if (row.monthly_cost <= 0) return 0;
  return Math.max(0, Math.round((row.revenue / row.monthly_cost) * 100));
}

/**
 * How many more monthly places at `unitPrice` would cover the gap.
 *
 * Rounded up, because eight and a half children do not exist and the point of
 * the number is to be able to say "we need three more".
 */
export function placesToBreakEven(
  row: Pick<Coverage, 'revenue' | 'monthly_cost'>,
  unitPrice: number,
): number {
  if (unitPrice <= 0 || row.monthly_cost <= 0) return 0;
  const gap = row.monthly_cost - row.revenue;
  return gap <= 0 ? 0 : Math.ceil(gap / unitPrice);
}
