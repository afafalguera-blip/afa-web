import { useEffect, useState } from 'react';
import { CalendarRange, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ConfigService, type SeasonConfig } from '../../../services/ConfigService';

/**
 * Self-contained panel (like AiKeysSettings) to manage the active course/
 * accounting year and whether the public inscription form is accepting entries.
 * New inscriptions / shop orders / finance transactions inherit `active_year`.
 */
export default function SeasonSettings() {
  const [season, setSeason] = useState<SeasonConfig>({
    active_year: '',
    inscriptions_open: false,
    open_at: null,
    close_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await ConfigService.getSeasonConfig();
        if (s) setSeason(s);
      } catch (e) {
        console.error(e);
        setError('Error carregant la configuració de curs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await ConfigService.updateSeasonConfig({
        ...season,
        active_year: season.active_year.trim(),
        open_at: season.open_at || null,
        close_at: season.close_at || null,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      setError('Error guardant la configuració de curs');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <CalendarRange className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Curs actiu</h3>
            <p className="text-sm text-neutral-500">
              Marca a quin curs s'assignen les noves inscripcions, comandes i transaccions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Curs (format AAAA-AA)
            </label>
            <input
              type="text"
              placeholder="2026-27"
              value={season.active_year}
              onChange={(e) => setSeason({ ...season, active_year: e.target.value })}
              className="h-11 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Inscripcions
            </label>
            <label className="flex items-center gap-3 h-11 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={season.inscriptions_open}
                onChange={(e) => setSeason({ ...season, inscriptions_open: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">
                {season.inscriptions_open ? 'Obertes (formulari visible)' : 'Tancades (formulari ocult)'}
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Data d'obertura (informativa)
            </label>
            <input
              type="date"
              value={season.open_at || ''}
              onChange={(e) => setSeason({ ...season, open_at: e.target.value || null })}
              className="h-11 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Data de tancament (informativa)
            </label>
            <input
              type="date"
              value={season.close_at || ''}
              onChange={(e) => setSeason({ ...season, close_at: e.target.value || null })}
              className="h-11 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 border border-neutral-100 dark:border-neutral-800">
          En canviar el curs actiu, les noves dades es guarden sota aquest curs sense esborrar
          l'històric. Filtra per curs als panells d'Inscripcions, Comandes i Finances.
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg">
          <AlertCircle size={20} />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-100 border border-green-200 text-green-700 rounded-lg">
          <CheckCircle2 size={20} />
          <p className="font-medium text-sm">Configuració de curs guardada!</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !season.active_year.trim()}
        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-3 shadow-sm shadow-primary/30 transition-all disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save size={20} /> Guardar curs</>}
      </button>
    </div>
  );
}
