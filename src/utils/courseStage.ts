/** Course stages used across the activities calendar and the inscription form. */
export type CourseStage = 'infantil' | 'primaria1' | 'primaria2';

/**
 * Maps a schedule group label ("Ed. infantil", "1r-3r", "4t-6è") to its course stage.
 * Returns null when the label cannot be classified.
 */
export function classifyGroup(groupName: string): CourseStage | null {
  const n = (groupName || '').toLowerCase();
  if (n.includes('infantil')) return 'infantil';
  if (/1r|2n|3r|1[ºo]|2[ºo]|3[ºo]|1-3|1 a 3/.test(n)) return 'primaria1';
  if (/4t|5è|6è|4[ºo]|5[ºo]|6[ºo]|4-6|4 a 6/.test(n)) return 'primaria2';
  return null;
}
