import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Check, Loader2, Search, UserPlus, X } from 'lucide-react';

import { AcollidaMonitorService } from '../services/AcollidaMonitorService';
import { toIsoDate } from '../logic/acollidaCalendar';
import { COURSE_BY_CODE, isCourseCode } from '../constants/courses';
import type { AcollidaRosterRow } from '../types/acollida';

/**
 * Taking the register, on a phone, standing at the door.
 *
 * Deliberately not translated and deliberately plain: it is one person doing
 * one thing in the two minutes before nine. Big targets, the expected children
 * already listed, and every tap saved immediately — nobody is going to press
 * "save" at 8:58 with a child pulling at their coat.
 *
 * There is no login. The link itself is the credential, so the page never shows
 * a phone number or an address: names and courses, which is what the register
 * needs, and nothing that would hurt if the link ended up in a WhatsApp group.
 */
export default function AcollidaAttendancePage() {
  const { token = '' } = useParams<{ token: string }>();

  // Read the clock once, when the page opens: a register that silently rolled
  // over to a new date mid-morning would move ticks to the wrong day.
  const [{ today, yesterday }] = useState(() => {
    const now = new Date();
    const before = new Date(now);
    before.setDate(before.getDate() - 1);
    return { today: toIsoDate(now), yesterday: toIsoDate(before) };
  });

  const [day, setDay] = useState(today);
  const [rows, setRows] = useState<AcollidaRosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AcollidaRosterRow[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await AcollidaMonitorService.getRoster(token, day));
      setError(null);
    } catch (err) {
      console.error('Error loading roster:', err);
      setError("Aquest enllaç no funciona. Demana'n un de nou a l'AFA.");
    } finally {
      setLoading(false);
    }
  }, [token, day]);

  useEffect(() => {
    load();
  }, [load]);

  // Search runs on its own once there are three letters, the same minimum the
  // database enforces: nobody types and then hunts for a button.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await AcollidaMonitorService.search(token, term);
        if (!cancelled) setResults(found);
      } catch (err) {
        console.error('Error searching children:', err);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, token]);

  const toggle = async (row: AcollidaRosterRow, present: boolean) => {
    setSaving(row.child_id);
    // Move first, ask later: the list has to answer the finger immediately.
    setRows((prev) =>
      prev.some((r) => r.child_id === row.child_id)
        ? prev.map((r) => (r.child_id === row.child_id ? { ...r, present } : r))
        : [...prev, { ...row, present }],
    );
    try {
      await AcollidaMonitorService.mark(token, day, row.child_id, present, row.rate_id);
      setQuery('');
      setResults([]);
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError('No s\'ha pogut desar. Torna-ho a provar.');
      await load();
    } finally {
      setSaving(null);
    }
  };

  const courseLabel = (code: string) => (isCourseCode(code) ? COURSE_BY_CODE[code].label : code);
  const present = rows.filter((r) => r.present);
  const alreadyListed = new Set(rows.map((r) => r.child_id));

  const dayButton = (value: string, label: string) => (
    <button
      type="button"
      onClick={() => setDay(value)}
      aria-pressed={day === value}
      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
        day === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <header className="bg-slate-900 text-white px-4 pt-6 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">Acollida</p>
        <h1 className="text-2xl font-black">Passar llista</h1>
        <p className="mt-1 text-white/70 text-sm">
          {present.length} {present.length === 1 ? 'infant' : 'infants'} marcats
        </p>
      </header>

      <div className="px-4 py-4 flex gap-2">
        {dayButton(today, 'Avui')}
        {dayButton(yesterday, 'Ahir')}
      </div>

      {error && (
        <div className="mx-4 mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-slate-500 py-16">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregant...
        </div>
      ) : (
        <ul className="px-4 space-y-2">
          {rows.length === 0 && (
            <li className="text-center text-slate-500 py-10 text-sm">
              Avui no hi ha ningú apuntat. Si ve algú, busca'l a sota.
            </li>
          )}
          {rows.map((row) => (
            <li key={row.child_id}>
              <button
                type="button"
                onClick={() => toggle(row, !row.present)}
                aria-pressed={row.present}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition ${
                  row.present ? 'bg-green-50 border-green-400' : 'bg-white border-slate-200'
                }`}
              >
                <span
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                    row.present ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {saving === row.child_id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : row.present ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-slate-900 truncate">
                    {row.name} {row.surname}
                  </span>
                  <span className="block text-xs text-slate-500 truncate">
                    {courseLabel(row.course)}
                    {row.slot ? ` · ${row.slot}` : ''}
                    {!row.expected ? ' · no estava apuntat' : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="px-4 mt-8">
        <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="cerca">
          Ha vingut algú més?
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="cerca"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom o cognom (3 lletres)"
            className="w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-4 py-3.5 text-base"
          />
        </div>

        {searching && <p className="mt-2 text-xs text-slate-500">Buscant...</p>}

        <ul className="mt-2 space-y-2">
          {results
            .filter((row) => !alreadyListed.has(row.child_id))
            .map((row) => (
              <li key={row.child_id}>
                <button
                  type="button"
                  onClick={() => toggle(row, true)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-left"
                >
                  <span className="w-11 h-11 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold text-slate-900 truncate">
                      {row.name} {row.surname}
                    </span>
                    <span className="block text-xs text-slate-500">{courseLabel(row.course)}</span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
