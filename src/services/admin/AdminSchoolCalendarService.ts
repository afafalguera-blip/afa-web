import { supabase } from '../../lib/supabase';
import type { SchoolClosedDay, SchoolClosureKind } from '../../types/acollida';
import { workingDaysBetween } from '../../logic/acollidaCalendar';

const TABLE = 'school_closed_days';

/**
 * The school calendar, as the days the centre is closed.
 *
 * Holidays are entered as a range because that is how they are read off the
 * calendar ("from 23 December to 7 January"), and marking fourteen days one by
 * one is how the fifteenth ends up missing. Weekends are skipped: nothing is
 * scheduled on them anyway, and listing them would bury the days that matter.
 */
export const AdminSchoolCalendarService = {
  async getRange(from: string, to: string): Promise<SchoolClosedDay[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .gte('day', from)
      .lte('day', to)
      .order('day');
    if (error) throw error;
    return (data || []) as SchoolClosedDay[];
  },

  async close(day: string, kind: SchoolClosureKind, label: string | null, academicYear: string | null): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ day, kind, label, academic_year: academicYear }, { onConflict: 'day' });
    if (error) throw error;
  },

  async closeRange(
    from: string,
    to: string,
    kind: SchoolClosureKind,
    label: string | null,
    academicYear: string | null,
  ): Promise<number> {
    const rows = workingDaysBetween(from, to).map((day) => ({
      day,
      kind,
      label,
      academic_year: academicYear,
    }));

    if (rows.length === 0) return 0;
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'day' });
    if (error) throw error;
    return rows.length;
  },

  async open(day: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('day', day);
    if (error) throw error;
  },
};

export default AdminSchoolCalendarService;
