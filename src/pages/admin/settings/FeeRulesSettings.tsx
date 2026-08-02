import { useEffect, useMemo, useState } from 'react';
import { Coins, Save, Loader2, AlertTriangle } from 'lucide-react';
import { ConfigService, type FeeRulesConfig } from '../../../services/ConfigService';
import { ActivityService, type Activity } from '../../../services/ActivityService';
import { useToast } from '../../../components/common/Toast';
import { SettingsSectionNote, ExternalPricesNote } from './PricingNotices';
import { useSettingsT } from './useSettingsT';

const DEFAULT_RULES: FeeRulesConfig = {
  exclude_activity_ids: [],
  exclude_titles: [],
  multiactivity: { min_activities: 2, member_price: 36, non_member_price: 40 },
};

/** Same prefix rule the SQL uses: an activity title matches the stored value. */
function matchesTitle(activityTitle: string, excludedTitle: string): boolean {
  if (!activityTitle || !excludedTitle) return false;
  return activityTitle.toLowerCase().startsWith(excludedTitle.toLowerCase());
}

interface FeeRulesSettingsProps {
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Monthly-fee rules: which activities the AFA does NOT bill, and the flat
 * multiactivity price. Exclusions are stored as stable `activities.id` so that
 * renaming an activity can no longer break receipt generation silently.
 */
export default function FeeRulesSettings({ onDirtyChange }: FeeRulesSettingsProps) {
  const t = useSettingsT();
  const { toast } = useToast();

  const [rules, setRules] = useState<FeeRulesConfig>(DEFAULT_RULES);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [orphanTitles, setOrphanTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [stored, acts] = await Promise.all([
          ConfigService.getFeeRulesConfig(),
          ActivityService.getAll(),
        ]);
        setActivities(acts);

        const merged: FeeRulesConfig = {
          ...DEFAULT_RULES,
          ...stored,
          multiactivity: { ...DEFAULT_RULES.multiactivity, ...stored?.multiactivity },
          exclude_activity_ids: stored?.exclude_activity_ids ?? [],
        };

        // Legacy configs only carry titles: resolve them to ids the same way the
        // SQL fallback does, and surface any title with no matching activity.
        if (merged.exclude_activity_ids.length === 0 && (stored?.exclude_titles?.length ?? 0) > 0) {
          const titles = stored!.exclude_titles!;
          const resolved = acts.filter((a) => titles.some((title) => matchesTitle(a.title, title)));
          merged.exclude_activity_ids = resolved.map((a) => a.id);
          setOrphanTitles(titles.filter((title) => !acts.some((a) => matchesTitle(a.title, title))));
        }

        setRules(merged);
      } catch (e) {
        console.error(e);
        toast.error(t('admin.settings.fee_rules.load_error', 'Error carregant les regles de quota'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (next: FeeRulesConfig) => {
    setRules(next);
    onDirtyChange?.(true);
  };

  const toggleActivity = (id: number) => {
    const current = rules.exclude_activity_ids;
    patch({
      ...rules,
      exclude_activity_ids: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    });
  };

  const selectedActivities = useMemo(
    () => activities.filter((a) => rules.exclude_activity_ids.includes(a.id)),
    [activities, rules.exclude_activity_ids]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await ConfigService.updateFeeRulesConfig({
        ...rules,
        // Mirror of the selection, kept only so a rollback to the pre-migration
        // SQL still excludes the right activities. Never edited by hand.
        exclude_titles: selectedActivities.map((a) => a.title),
      });
      setOrphanTitles([]);
      onDirtyChange?.(false);
      toast.success(t('admin.settings.fee_rules.saved', 'Regles de quota guardades'));
    } catch (e) {
      console.error(e);
      toast.error(t('admin.settings.fee_rules.save_error', 'Error guardant les regles de quota'));
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

  const m = rules.multiactivity;

  return (
    <div className="space-y-6">
      <SettingsSectionNote
        title={t('admin.settings.fee_rules.note_title', 'Quota mensual de les extraescolars')}
        body={t(
          'admin.settings.fee_rules.note_body',
          "Afecta l'import dels rebuts mensuals que es creen des de Cobraments. Aquí només decideixes quines activitats NO factura l'AFA i el preu combinat; el preu de cada activitat s'edita a la seva fitxa."
        )}
        consumedBy="generate_monthly_payments → student_monthly_fee → is_activity_excluded"
      />

      <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-neutral-100 border border-neutral-200 p-2 rounded-lg">
            <Coins className="w-5 h-5 text-neutral-700" />
          </div>
          <div>
            <h3 className="font-bold text-base text-neutral-900">
              {t('admin.settings.fee_rules.title', 'Regles de quota mensual')}
            </h3>
            <p className="text-sm text-neutral-500">
              {t(
                'admin.settings.fee_rules.subtitle',
                'Exclusions i preu combinat aplicats sobre els preus per activitat.'
              )}
            </p>
          </div>
        </div>

        {/* Exclusions, by stable activity id */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-neutral-700">
            {t('admin.settings.fee_rules.exclusions_label', "Activitats excloses de la quota AFA")}
          </label>
          <p className="text-xs text-neutral-500">
            {t(
              'admin.settings.fee_rules.exclusions_help',
              "No generen rebut de l'AFA perquè es paguen a part (p. ex. l'anglès a l'acadèmia externa). Se seleccionen del catàleg: si canvies el nom de l'activitat, l'exclusió es manté."
            )}
          </p>

          {orphanTitles.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
              <AlertTriangle className="w-[18px] h-[18px] mt-0.5 flex-shrink-0 text-amber-600" aria-hidden="true" />
              <p className="text-[13px] leading-5 text-amber-900">
                {t(
                  'admin.settings.fee_rules.orphan_warning',
                  'Aquestes exclusions antigues es feien per nom i ja no coincideixen amb cap activitat. Revisa la selecció i desa per corregir-ho:'
                )}{' '}
                <span className="font-medium">{orphanTitles.join(', ')}</span>
              </p>
            </div>
          )}

          {activities.length === 0 ? (
            <p className="text-sm text-neutral-400 italic">
              {t('admin.settings.fee_rules.no_activities', 'No hi ha activitats al catàleg.')}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 p-2">
              {activities.map((activity) => {
                const checked = rules.exclude_activity_ids.includes(activity.id);
                return (
                  <label
                    key={activity.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                      checked ? 'border-neutral-300 bg-neutral-100' : 'border-transparent hover:bg-neutral-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleActivity(activity.id)}
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-neutral-800 truncate">
                        {activity.title}
                      </span>
                      <span className="block text-[11px] font-mono text-neutral-400">#{activity.id}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          <p className="text-xs text-neutral-500">
            {selectedActivities.length === 0
              ? t('admin.settings.fee_rules.no_exclusions', 'Cap exclusió: totes les activitats es facturen.')
              : t('admin.settings.fee_rules.exclusions_count', 'Excloses') +
                ': ' +
                selectedActivities.map((a) => a.title).join(', ')}
          </p>
        </div>

        {/* Multiactivity flat price */}
        <div className="space-y-3 border-t border-neutral-100 pt-5">
          <label className="block text-sm font-medium text-neutral-700">
            {t('admin.settings.fee_rules.multiactivity_label', 'Preu combinat «Multiactivitat»')}
          </label>
          <p className="text-xs text-neutral-500">
            {t(
              'admin.settings.fee_rules.multiactivity_help',
              "Quan un alumne fa com a mínim aquest nombre d'activitats facturables, s'aplica un preu únic en comptes de sumar-les."
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-500">
                {t('admin.settings.fee_rules.min_activities', 'Activitats mínimes')}
              </span>
              <input
                type="number"
                min={2}
                value={m.min_activities}
                onChange={(e) => patch({ ...rules, multiactivity: { ...m, min_activities: Number(e.target.value) } })}
                className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-500">
                {t('admin.settings.fee_rules.member_price', 'Preu soci (€/mes)')}
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={m.member_price}
                onChange={(e) => patch({ ...rules, multiactivity: { ...m, member_price: Number(e.target.value) } })}
                className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-500">
                {t('admin.settings.fee_rules.non_member_price', 'Preu no soci (€/mes)')}
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={m.non_member_price}
                onChange={(e) => patch({ ...rules, multiactivity: { ...m, non_member_price: Number(e.target.value) } })}
                className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
          </div>
        </div>
      </div>

      <ExternalPricesNote only={['activities']} />

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-admin-accent hover:bg-admin-accent-hover text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Save size={16} /> {t('admin.settings.fee_rules.save', 'Guardar regles')}
          </>
        )}
      </button>
    </div>
  );
}
