import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { monthMatrix, shiftMonth } from '../../../logic/acollidaCalendar';
import { ACOLLIDA_WEEKDAYS, WEEKDAY_I18N_KEYS } from '../../../types/acollida';

interface Props {
  /** Selected days, yyyy-mm-dd. */
  value: string[];
  onChange: (dates: string[]) => void;
  /** Days with no seat left. Shown struck through and refused on tap. */
  fullDates?: string[];
  /** Called when the family taps a full day, so the form can offer the queue. */
  onFullDayTapped?: (iso: string) => void;
  /** Month on screen, so the caller can fetch that month's occupancy. */
  onMonthChange?: (year: number, month: number) => void;
}

/**
 * Days-out picker: a month always on screen, days toggled by tapping them.
 *
 * It replaces a native `<input type="date">`, which closed after every single
 * pick — booking eight days meant opening the same calendar eight times, and
 * the days already chosen were nowhere to be seen while choosing the next one.
 */
export function OccasionalDatesPicker({ value, onChange, fullDates = [], onFullDayTapped, onMonthChange }: Props) {
  const { t, i18n } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() + 1 }));

  const rows = useMemo(() => monthMatrix(cursor.year, cursor.month, today), [cursor, today]);
  const selected = useMemo(() => new Set(value), [value]);
  const full = useMemo(() => new Set(fullDates), [fullDates]);

  useEffect(() => {
    onMonthChange?.(cursor.year, cursor.month);
  }, [cursor, onMonthChange]);
  const locale = i18n.resolvedLanguage || 'ca';

  const monthLabel = new Date(cursor.year, cursor.month - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  const toggle = (iso: string) => {
    if (full.has(iso) && !selected.has(iso)) {
      onFullDayTapped?.(iso);
      return;
    }
    onChange(selected.has(iso) ? value.filter((d) => d !== iso) : [...value, iso].sort());
  };

  // Nothing to go back to before the current month: those days cannot be booked.
  const atFirstMonth = cursor.year === today.getFullYear() && cursor.month === today.getMonth() + 1;

  const navButton =
    'p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          type="button"
          onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}
          disabled={atFirstMonth}
          className={navButton}
          aria-label={t('acollida_form.calendar_prev', 'Mes anterior')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-slate-800 dark:text-slate-100 capitalize" aria-live="polite">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}
          className={navButton}
          aria-label={t('acollida_form.calendar_next', 'Mes següent')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {ACOLLIDA_WEEKDAYS.map((day) => (
          <span key={day} className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t(WEEKDAY_I18N_KEYS[day]).slice(0, 2)}
          </span>
        ))}
      </div>

      <div className="space-y-1.5">
        {rows.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-5 gap-1.5">
            {week.map((cell, cellIndex) => {
              if (!cell) return <span key={`empty-${cellIndex}`} />;
              const isSelected = selected.has(cell.iso);
              const isFull = full.has(cell.iso) && !isSelected;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => toggle(cell.iso)}
                  disabled={cell.past}
                  aria-pressed={isSelected}
                  aria-disabled={isFull}
                  title={isFull ? t('acollida_form.calendar_day_full', 'Complet') : undefined}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : cell.past
                        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                        : isFull
                          ? 'text-slate-400 dark:text-slate-600 line-through bg-slate-50 dark:bg-slate-800/60'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-500">
          {value.length === 0
            ? t('acollida_form.calendar_hint', 'Toca els dies que necessiteu. Pots triar-ne de diversos mesos.')
            : t('acollida_form.calendar_selected', '{{count}} dies triats', { count: value.length })}
        </p>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors shrink-0"
          >
            {t('acollida_form.calendar_clear', 'Buidar')}
          </button>
        )}
      </div>
    </div>
  );
}
