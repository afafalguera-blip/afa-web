import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Save, Users } from 'lucide-react';

import { AdminAcollidaInscriptionsService } from '../../../services/admin/AdminAcollidaInscriptionsService';
import { monthMatrix, shiftMonth, toIsoDate } from '../../../logic/acollidaCalendar';
import { occupancyLevel } from '../../../logic/acollidaCapacity';
import {
  ACOLLIDA_CAPACITY_GROUPS,
  type AcollidaCapacity,
  type AcollidaCapacityGroup,
  type AcollidaOccupancyDay,
} from '../../../types/acollida';

const GROUP_LABELS: Record<AcollidaCapacityGroup, { key: string; fallback: string }> = {
  mati: { key: 'admin.acollida_occupancy.group_morning', fallback: 'Matí' },
  tarda: { key: 'admin.acollida_occupancy.group_afternoon', fallback: 'Tarda' },
};

/**
 * How full each room is, day by day.
 *
 * The month grid is the same one the family sees when picking days out, on
 * purpose: when a family says "the 14th was closed", the AFA looks at the same
 * square they did.
 */
export function OccupancyTab() {
  const { t } = useTranslation();
  const today = useMemo(() => new Date(), []);

  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() + 1 }));
  const [group, setGroup] = useState<AcollidaCapacityGroup>('mati');
  const [days, setDays] = useState<AcollidaOccupancyDay[]>([]);
  const [capacity, setCapacity] = useState<AcollidaCapacity[]>([]);
  const [seatsDraft, setSeatsDraft] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = `${cursor.year}-${String(cursor.month).padStart(2, '0')}-01`;
      const to = toIsoDate(new Date(cursor.year, cursor.month, 0));
      const [occupancy, seats] = await Promise.all([
        AdminAcollidaInscriptionsService.getOccupancy(from, to),
        AdminAcollidaInscriptionsService.getCapacity(),
      ]);
      setDays(occupancy);
      setCapacity(seats);
    } catch (err) {
      console.error('Error loading acollida occupancy:', err);
      setError(t('admin.acollida_occupancy.load_error', "No s'ha pogut carregar l'ocupació."));
    } finally {
      setLoading(false);
    }
  }, [cursor, t]);

  useEffect(() => {
    load();
  }, [load]);

  const seatsOfGroup = capacity.find((c) => c.capacity_group === group)?.seats ?? 0;

  useEffect(() => {
    setSeatsDraft(String(seatsOfGroup));
  }, [seatsOfGroup, group]);

  const byDay = useMemo(() => {
    const map = new Map<string, AcollidaOccupancyDay>();
    for (const day of days) {
      if (day.capacity_group === group) map.set(day.day, day);
    }
    return map;
  }, [days, group]);

  const rows = useMemo(() => monthMatrix(cursor.year, cursor.month, today), [cursor, today]);

  const saveSeats = async () => {
    const seats = Number(seatsDraft);
    if (!Number.isInteger(seats) || seats < 0) return;
    setSaving(true);
    try {
      await AdminAcollidaInscriptionsService.setCapacity(group, seats);
      await load();
    } catch (err) {
      console.error('Error saving acollida capacity:', err);
      setError(t('admin.acollida_occupancy.save_error', "No s'han pogut desar les places."));
    } finally {
      setSaving(false);
    }
  };

  const fullCount = [...byDay.values()].filter((d) => d.free <= 0).length;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {ACOLLIDA_CAPACITY_GROUPS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGroup(option)}
                aria-pressed={group === option}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition ${
                  group === option
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                }`}
              >
                {t(GROUP_LABELS[option].key, GROUP_LABELS[option].fallback)}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <div>
              <label
                className="block text-xs font-semibold text-slate-500 mb-1"
                htmlFor="acollida_seats"
              >
                {t('admin.acollida_occupancy.seats', 'Places de la sala')}
              </label>
              <input
                id="acollida_seats"
                type="number"
                min={0}
                value={seatsDraft}
                onChange={(e) => setSeatsDraft(e.target.value)}
                className="w-24 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={saveSeats}
              disabled={saving || seatsDraft === String(seatsOfGroup)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('common.save', 'Desar')}
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {t(
            'admin.acollida_occupancy.seats_hint',
            'Les tres franges de matí comparteixen sala: entre les 8:30 i les 9 hi són totes alhora, així que les places són del grup i no de cada franja. Pujar-les és la manera de deixar entrar una excepció.',
          )}
        </p>
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
              {fullCount > 0
                ? t('admin.acollida_occupancy.full_days', '{{count}} dies complets', { count: fullCount })
                : t('admin.acollida_occupancy.no_full_days', 'Cap dia complet')}
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
                  const day = byDay.get(cell.iso);
                  const level = day ? occupancyLevel(day) : 'free';
                  return (
                    <div
                      key={cell.iso}
                      className={`rounded-xl border p-2 text-center ${
                        level === 'full'
                          ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-900/50'
                          : level === 'tight'
                            ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/50'
                            : 'border-slate-200 dark:border-slate-800'
                      } ${cell.past ? 'opacity-50' : ''}`}
                    >
                      <p className="text-xs font-bold text-slate-500">{cell.day}</p>
                      <p
                        className={`text-sm font-black ${
                          level === 'full'
                            ? 'text-red-700 dark:text-red-300'
                            : level === 'tight'
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {day ? `${day.total}/${day.seats}` : '—'}
                      </p>
                      {day && day.total > 0 && (
                        <p className="text-[10px] text-slate-500">
                          {t('admin.acollida_occupancy.split', '{{monthly}} mes · {{occasional}} solts', {
                            monthly: day.monthly,
                            occasional: day.occasional,
                          })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
          <Users className="w-3.5 h-3.5" />
          {t(
            'admin.acollida_occupancy.counts_hint',
            'Només compten les sol·licituds confirmades: una de pendent no reserva plaça.',
          )}
        </p>
      </div>
    </div>
  );
}

export default OccupancyTab;
