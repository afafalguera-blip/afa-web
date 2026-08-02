import { useEffect, useState } from 'react';
import { CalendarRange, Save, Loader2 } from 'lucide-react';
import { ConfigService, type SeasonConfig } from '../../../services/ConfigService';
import { useToast } from '../../../components/common/Toast';
import { useSettingsT } from './useSettingsT';

interface SeasonSettingsProps {
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Self-contained panel for the active course/accounting year and whether the
 * public inscription form accepts entries. New inscriptions / shop orders /
 * finance transactions inherit `active_year`.
 */
export default function SeasonSettings({ onDirtyChange }: SeasonSettingsProps) {
  const t = useSettingsT();
  const { toast } = useToast();

  const [season, setSeason] = useState<SeasonConfig>({
    active_year: '',
    inscriptions_open: false,
    open_at: null,
    close_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await ConfigService.getSeasonConfig();
        if (s) setSeason(s);
      } catch (e) {
        console.error(e);
        toast.error(t('admin.settings.season.load_error', 'Error carregant la configuració de curs'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (next: SeasonConfig) => {
    setSeason(next);
    onDirtyChange?.(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await ConfigService.updateSeasonConfig({
        ...season,
        active_year: season.active_year.trim(),
        open_at: season.open_at || null,
        close_at: season.close_at || null,
      });
      onDirtyChange?.(false);
      toast.success(t('admin.settings.season.saved', 'Configuració de curs guardada'));
    } catch (e) {
      console.error(e);
      toast.error(t('admin.settings.season.save_error', 'Error guardant la configuració de curs'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-neutral-100 border border-neutral-200 p-2 rounded-lg">
            <CalendarRange className="w-5 h-5 text-neutral-700" />
          </div>
          <div>
            <h3 className="font-bold text-base text-neutral-900">
              {t('admin.settings.season.title', 'Curs actiu')}
            </h3>
            <p className="text-sm text-neutral-500">
              {t(
                'admin.settings.season.subtitle',
                "Marca a quin curs s'assignen les noves inscripcions, comandes i transaccions."
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">
              {t('admin.settings.season.year_label', 'Curs (format AAAA-AA)')}
            </label>
            <input
              type="text"
              placeholder="2026-27"
              value={season.active_year}
              onChange={(e) => patch({ ...season, active_year: e.target.value })}
              className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">
              {t('admin.settings.season.inscriptions_label', 'Inscripcions')}
            </label>
            <label className="flex items-center gap-3 h-11 px-3 rounded-lg border border-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={season.inscriptions_open}
                onChange={(e) => patch({ ...season, inscriptions_open: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
              />
              <span className="text-sm font-medium">
                {season.inscriptions_open
                  ? t('admin.settings.season.open', 'Obertes (formulari visible)')
                  : t('admin.settings.season.closed', 'Tancades (formulari ocult)')}
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">
              {t('admin.settings.season.open_at', "Data d'obertura (informativa)")}
            </label>
            <input
              type="date"
              value={season.open_at || ''}
              onChange={(e) => patch({ ...season, open_at: e.target.value || null })}
              className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">
              {t('admin.settings.season.close_at', 'Data de tancament (informativa)')}
            </label>
            <input
              type="date"
              value={season.close_at || ''}
              onChange={(e) => patch({ ...season, close_at: e.target.value || null })}
              className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>
        </div>

        <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3 border border-neutral-200">
          {t(
            'admin.settings.season.hint',
            "En canviar el curs actiu, les noves dades es guarden sota aquest curs sense esborrar l'històric. Filtra per curs als panells d'Inscripcions, Comandes i Finances."
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !season.active_year.trim()}
        className="w-full bg-admin-accent hover:bg-admin-accent-hover text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Save size={16} /> {t('admin.settings.season.save', 'Guardar curs')}
          </>
        )}
      </button>
    </div>
  );
}
