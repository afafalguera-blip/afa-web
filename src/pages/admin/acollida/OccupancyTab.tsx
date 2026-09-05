import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Save, Users } from 'lucide-react';

import { AdminAcollidaInscriptionsService } from '../../../services/admin/AdminAcollidaInscriptionsService';
import { AdminSchoolCalendarService } from '../../../services/admin/AdminSchoolCalendarService';
import { monthMatrix, shiftMonth, toIsoDate } from '../../../logic/acollidaCalendar';
import { occupancyLevel } from '../../../logic/acollidaCapacity';
import {
  coverageLevel,
  coveragePercent,
  placesToBreakEven,
  type Coverage,
} from '../../../logic/acollidaCoverage';
import { formatEuro, unitPrice } from '../../../logic/acollidaPricing';
import { AdminAcollidaService } from '../../../services/admin/AdminAcollidaService';
import type { AcollidaRate } from '../../../types/acollida';
import {
  ACOLLIDA_CAPACITY_GROUPS,
  type AcollidaCapacity,
  type AcollidaCapacityGroup,
  type AcollidaOccupancyDay,
  type SchoolClosedDay,
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
  const [closed, setClosed] = useState<SchoolClosedDay[]>([]);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [rates, setRates] = useState<AcollidaRate[]>([]);
  const [costDraft, setCostDraft] = useState('');
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
      const [occupancy, seats, closedDays, months, rateRows] = await Promise.all([
        AdminAcollidaInscriptionsService.getOccupancy(from, to),
        AdminAcollidaInscriptionsService.getCapacity(),
        AdminSchoolCalendarService.getRange(from, to),
        AdminAcollidaInscriptionsService.getCoverage(cursor.month, cursor.year),
        AdminAcollidaService.getAll(),
      ]);
      setDays(occupancy);
      setCapacity(seats);
      setClosed(closedDays);
      setCoverage(months);
      setRates(rateRows as AcollidaRate[]);
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

  const capacityOfGroup = capacity.find((c) => c.capacity_group === group);
  const seatsOfGroup = capacityOfGroup?.seats ?? 0;
  const costOfGroup = capacityOfGroup?.monthly_cost ?? 0;
  const coverageOfGroup = coverage.find((c) => c.capacity_group === group);

  useEffect(() => {
    setSeatsDraft(String(seatsOfGroup));
    setCostDraft(String(costOfGroup));
  }, [seatsOfGroup, costOfGroup, group]);

  /**
   * The dearest monthly fee of the room, which is what "one more place" is
   * worth at best: the gap is easier to close than this number suggests, never
   * harder, so nobody plans on an optimistic figure.
   */
  const bestMonthlyFee = useMemo(() => {
    const groupRates = rates.filter((r) => r.capacity_group === group);
    return groupRates.reduce((max, rate) => Math.max(max, unitPrice(rate, true, 'mensual') ?? 0), 0);
  }, [rates, group]);

  const byDay = useMemo(() => {
    const map = new Map<string, AcollidaOccupancyDay>();
    for (const day of days) {
      if (day.capacity_group === group) map.set(day.day, day);
    }
    return map;
  }, [days, group]);

  const rows = useMemo(() => monthMatrix(cursor.year, cursor.month, today), [cursor, today]);
  const closedByDay = useMemo(() => {
    const map = new Map<string, SchoolClosedDay>();
    for (const row of closed) map.set(row.day, row);
    return map;
  }, [closed]);

  const saveSeats = async () => {
    const seats = Number(seatsDraft);
    const cost = Number(costDraft);
    if (!Number.isInteger(seats) || seats < 0 || !Number.isFinite(cost) || cost < 0) return;
    setSaving(true);
    try {
      if (seats !== seatsOfGroup) await AdminAcollidaInscriptionsService.setCapacity(group, seats);
      if (cost !== costOfGroup) await AdminAcollidaInscriptionsService.setMonthlyCost(group, cost);
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
            <div>
              <label
                className="block text-xs font-semibold text-slate-500 mb-1"
                htmlFor="acollida_cost"
              >
                {t('admin.acollida_occupancy.cost', 'Cost al mes (€)')}
              </label>
              <input
                id="acollida_cost"
                type="number"
                min={0}
                step="0.01"
                value={costDraft}
                onChange={(e) => setCostDraft(e.target.value)}
                className="w-28 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={saveSeats}
              disabled={saving || (seatsDraft === String(seatsOfGroup) && costDraft === String(costOfGroup))}
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

      {coverageOfGroup && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          {(() => {
            const level = coverageLevel(coverageOfGroup);
            const percent = coveragePercent(coverageOfGroup);
            const missing = placesToBreakEven(coverageOfGroup, bestMonthlyFee);

            const tone =
              level === 'covered'
                ? { bar: 'bg-green-500', text: 'text-green-700 dark:text-green-300' }
                : level === 'close'
                  ? { bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' }
                  : { bar: 'bg-red-500', text: 'text-red-700 dark:text-red-300' };

            return (
              <>
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <p className="font-black text-slate-900 dark:text-white">
                    {t('admin.acollida_occupancy.coverage_title', 'Cobreix el mes el seu cost?')}
                  </p>
                  {level === 'unset' ? (
                    <p className="text-sm text-slate-500">
                      {t('admin.acollida_occupancy.coverage_unset', 'Posa el cost del monitoratge per veure-ho.')}
                    </p>
                  ) : (
                    <p className={`text-sm font-bold ${tone.text}`}>{percent}%</p>
                  )}
                </div>

                {level !== 'unset' && (
                  <>
                    <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${tone.bar} transition-all`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>

                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      {t('admin.acollida_occupancy.coverage_line', '{{confirmed}} confirmades · {{revenue}} previstos · cost {{cost}}', {
                        confirmed: coverageOfGroup.confirmed,
                        revenue: formatEuro(coverageOfGroup.revenue),
                        cost: formatEuro(coverageOfGroup.monthly_cost),
                      })}
                    </p>

                    <p className={`mt-1 text-sm font-semibold ${tone.text}`}>
                      {missing > 0
                        ? t('admin.acollida_occupancy.coverage_missing', 'Falten {{count}} quotes mensuals per cobrir-lo', { count: missing })
                        : t('admin.acollida_occupancy.coverage_ok', "El mes es paga sol; a partir d'aquí és marge.")}
                    </p>
                  </>
                )}

                <p className="mt-3 text-xs text-slate-500">
                  {t(
                    'admin.acollida_occupancy.coverage_hint',
                    "El cost és fix: el monitoratge val el mateix vinguin deu infants o dos, així que cada plaça buida són diners que ningú paga. L'ingrés surt de la mateixa funció que genera els rebuts.",
                  )}
                </p>
              </>
            );
          })()}
        </section>
      )}

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
                  const closedDay = closedByDay.get(cell.iso);
                  const level = day ? occupancyLevel(day) : 'free';

                  // A closed day is not an empty one: there is no service at all.
                  if (closedDay) {
                    return (
                      <div
                        key={cell.iso}
                        className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-2 text-center"
                      >
                        <p className="text-xs font-bold text-slate-400">{cell.day}</p>
                        <p className="text-[10px] leading-tight text-slate-400 truncate">
                          {closedDay.label || t('admin.school_calendar.no_school', 'Sense escola')}
                        </p>
                      </div>
                    );
                  }

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
