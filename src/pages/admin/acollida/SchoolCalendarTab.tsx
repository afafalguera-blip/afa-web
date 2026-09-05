import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CalendarOff, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';

import { useToast } from '../../../components/common/Toast';
import { AdminSchoolCalendarService } from '../../../services/admin/AdminSchoolCalendarService';
import { monthMatrix, shiftMonth, toIsoDate } from '../../../logic/acollidaCalendar';
import { SCHOOL_CLOSURE_KINDS, type SchoolClosedDay, type SchoolClosureKind } from '../../../types/acollida';

const KIND_LABELS: Record<SchoolClosureKind, { key: string; fallback: string }> = {
  festiu: { key: 'admin.school_calendar.kind_holiday', fallback: 'Festiu' },
  lliure_disposicio: { key: 'admin.school_calendar.kind_free', fallback: 'Lliure disposició' },
  vacances: { key: 'admin.school_calendar.kind_break', fallback: 'Vacances' },
  altres: { key: 'admin.school_calendar.kind_other', fallback: 'Altres' },
};

const KIND_STYLE: Record<SchoolClosureKind, string> = {
  festiu: 'bg-red-100 text-red-800 border-red-300',
  lliure_disposicio: 'bg-violet-100 text-violet-800 border-violet-300',
  vacances: 'bg-sky-100 text-sky-800 border-sky-300',
  altres: 'bg-slate-200 text-slate-700 border-slate-300',
};

const inputClass =
  'rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white';

/**
 * Days with no school, marked on the same grid the families see.
 *
 * A closed day is not "zero seats": there is no service, so it disappears from
 * the occupancy grid and the sign-up form refuses it. Holidays go in as a range
 * because that is how a calendar states them — «from 23 December to 7 January» —
 * and clicking fourteen days one by one is how the fifteenth gets forgotten.
 */
export function SchoolCalendarTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const today = useMemo(() => new Date(), []);

  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() + 1 }));
  const [closed, setClosed] = useState<SchoolClosedDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<SchoolClosureKind>('vacances');
  const [label, setLabel] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [savingRange, setSavingRange] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = `${cursor.year}-${String(cursor.month).padStart(2, '0')}-01`;
      const to = toIsoDate(new Date(cursor.year, cursor.month, 0));
      setClosed(await AdminSchoolCalendarService.getRange(from, to));
    } catch (err) {
      console.error('Error loading school calendar:', err);
      setError(t('admin.school_calendar.load_error', "No s'ha pogut carregar el calendari."));
    } finally {
      setLoading(false);
    }
  }, [cursor, t]);

  useEffect(() => {
    load();
  }, [load]);

  const closedByDay = useMemo(() => {
    const map = new Map<string, SchoolClosedDay>();
    for (const row of closed) map.set(row.day, row);
    return map;
  }, [closed]);

  /** September onwards belongs to the year that starts; before, to the one that ends. */
  const academicYear = (iso: string): string => {
    const [year, month] = iso.split('-').map(Number);
    const start = month >= 9 ? year : year - 1;
    return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
  };

  const toggleDay = async (iso: string) => {
    const existing = closedByDay.get(iso);
    try {
      if (existing) {
        await AdminSchoolCalendarService.open(iso);
      } else {
        await AdminSchoolCalendarService.close(iso, kind, label.trim() || null, academicYear(iso));
      }
      await load();
    } catch (err) {
      console.error('Error updating school calendar:', err);
      toast.error(t('admin.school_calendar.save_error', "No s'ha pogut desar el dia."));
    }
  };

  const saveRange = async () => {
    if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) return;
    setSavingRange(true);
    try {
      const count = await AdminSchoolCalendarService.closeRange(
        rangeFrom,
        rangeTo,
        kind,
        label.trim() || null,
        academicYear(rangeFrom),
      );
      toast.success(t('admin.school_calendar.range_saved', '{{count}} dies marcats', { count }));
      setRangeFrom('');
      setRangeTo('');
      await load();
    } catch (err) {
      console.error('Error saving school calendar range:', err);
      toast.error(t('admin.school_calendar.save_error', "No s'ha pogut desar el dia."));
    } finally {
      setSavingRange(false);
    }
  };

  const rows = useMemo(() => monthMatrix(cursor.year, cursor.month, today), [cursor, today]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="closure_kind">
              {t('admin.school_calendar.kind', 'Motiu')}
            </label>
            <select
              id="closure_kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as SchoolClosureKind)}
              className={inputClass}
            >
              {SCHOOL_CLOSURE_KINDS.map((option) => (
                <option key={option} value={option}>
                  {t(KIND_LABELS[option].key, KIND_LABELS[option].fallback)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="closure_label">
              {t('admin.school_calendar.label', 'Nom (opcional)')}
            </label>
            <input
              id="closure_label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('admin.school_calendar.label_placeholder', 'Vacances de Nadal')}
              className={`${inputClass} w-full`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="closure_from">
              {t('admin.school_calendar.range_from', 'Del')}
            </label>
            <input
              id="closure_from"
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="closure_to">
              {t('admin.school_calendar.range_to', 'Al')}
            </label>
            <input
              id="closure_to"
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={saveRange}
            disabled={savingRange || !rangeFrom || !rangeTo || rangeFrom > rangeTo}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
          >
            {savingRange ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t('admin.school_calendar.add_range', 'Marcar el període')}
          </button>
          <p className="text-xs text-slate-500 flex-1 min-w-[200px]">
            {t(
              'admin.school_calendar.range_hint',
              'Els caps de setmana se salten sols. Al calendari de sota, cada dia es tanca i s\'obre amb un clic.',
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between gap-2 mb-5">
          <button
            type="button"
            onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 transition"
            aria-label={t('acollida_form.calendar_prev', 'Mes anterior')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="font-black text-slate-900 dark:text-white capitalize">
              {new Date(cursor.year, cursor.month - 1, 1).toLocaleDateString('ca', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="text-xs text-slate-500">
              {closed.length > 0
                ? t('admin.school_calendar.closed_count', '{{count}} dies sense escola', { count: closed.length })
                : t('admin.school_calendar.no_closed', 'Cap dia marcat')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 transition"
            aria-label={t('acollida_form.calendar_next', 'Mes següent')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-slate-500 py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('common.loading', 'Carregant...')}
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-5 gap-2">
                {week.map((cell, cellIndex) => {
                  if (!cell) return <span key={`empty-${cellIndex}`} />;
                  const row = closedByDay.get(cell.iso);
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => toggleDay(cell.iso)}
                      aria-pressed={Boolean(row)}
                      className={`rounded-xl border p-2 text-center transition ${
                        row
                          ? KIND_STYLE[row.kind]
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                      }`}
                    >
                      <span className="block text-sm font-bold">{cell.day}</span>
                      <span className="block text-[10px] leading-tight truncate">
                        {row
                          ? row.label || t(KIND_LABELS[row.kind].key, KIND_LABELS[row.kind].fallback)
                          : t('admin.school_calendar.open', 'Amb escola')}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
          <CalendarOff className="w-3.5 h-3.5" />
          {t(
            'admin.school_calendar.hint',
            "Un dia marcat desapareix de la graella d'ocupació i el formulari no el deixa demanar.",
          )}
        </p>
      </div>
    </div>
  );
}

export default SchoolCalendarTab;
