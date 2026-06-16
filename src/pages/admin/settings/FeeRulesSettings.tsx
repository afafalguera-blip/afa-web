import { useEffect, useState } from 'react';
import { Coins, Save, CheckCircle2, AlertCircle, Loader2, Plus, X } from 'lucide-react';
import { ConfigService, type FeeRulesConfig } from '../../../services/ConfigService';

const DEFAULT_RULES: FeeRulesConfig = {
  exclude_titles: ['Anglès'],
  multiactivity: { min_activities: 2, member_price: 36, non_member_price: 40 },
};

/**
 * Self-contained panel for the configurable monthly-fee rules. Per-activity
 * prices are edited in the Activities editor; this covers exclusions and the
 * multiactivity flat price applied by generate_monthly_payments*.
 */
export default function FeeRulesSettings() {
  const [rules, setRules] = useState<FeeRulesConfig>(DEFAULT_RULES);
  const [newExclude, setNewExclude] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await ConfigService.getFeeRulesConfig();
        if (r) setRules({ ...DEFAULT_RULES, ...r, multiactivity: { ...DEFAULT_RULES.multiactivity, ...r.multiactivity } });
      } catch (e) {
        console.error(e);
        setError('Error carregant les regles de quota');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addExclude = () => {
    const t = newExclude.trim();
    if (!t || rules.exclude_titles.includes(t)) return;
    setRules({ ...rules, exclude_titles: [...rules.exclude_titles, t] });
    setNewExclude('');
  };

  const removeExclude = (t: string) =>
    setRules({ ...rules, exclude_titles: rules.exclude_titles.filter((x) => x !== t) });

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await ConfigService.updateFeeRulesConfig(rules);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      setError('Error guardant les regles de quota');
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

  const m = rules.multiactivity;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Coins className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Regles de quota mensual</h3>
            <p className="text-sm text-neutral-500">
              Els preus per activitat s'editen a Activitats. Aquí defineixes exclusions i el preu combinat.
            </p>
          </div>
        </div>

        {/* Exclusions */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Activitats excloses de la quota AFA
          </label>
          <p className="text-xs text-neutral-500">
            No generen cuota (es paguen a part, p. ex. l'anglès amb l'acadèmia externa). S'hi posa el títol de l'activitat.
          </p>
          <div className="flex flex-wrap gap-2">
            {rules.exclude_titles.map((t) => (
              <span key={t} className="inline-flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 text-sm font-medium px-3 py-1.5 rounded-lg">
                {t}
                <button type="button" onClick={() => removeExclude(t)} className="text-neutral-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
            {rules.exclude_titles.length === 0 && (
              <span className="text-sm text-neutral-400 italic">Cap exclusió</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Títol de l'activitat (p. ex. Anglès)"
              value={newExclude}
              onChange={(e) => setNewExclude(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExclude(); } }}
              className="h-10 flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button type="button" onClick={addExclude} className="flex items-center gap-1 px-4 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm font-bold hover:bg-neutral-200">
              <Plus className="w-4 h-4" /> Afegir
            </button>
          </div>
        </div>

        {/* Multiactivity */}
        <div className="space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-5">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Preu combinat «Multiactivitat»
          </label>
          <p className="text-xs text-neutral-500">
            Quan un alumne fa com a mínim aquest nombre d'activitats facturables, s'aplica un preu únic en comptes de sumar-les.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-500">Activitats mínimes</span>
              <input
                type="number" min={2}
                value={m.min_activities}
                onChange={(e) => setRules({ ...rules, multiactivity: { ...m, min_activities: Number(e.target.value) } })}
                className="h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-500">Preu soci (€/mes)</span>
              <input
                type="number" min={0} step="0.01"
                value={m.member_price}
                onChange={(e) => setRules({ ...rules, multiactivity: { ...m, member_price: Number(e.target.value) } })}
                className="h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-500">Preu no soci (€/mes)</span>
              <input
                type="number" min={0} step="0.01"
                value={m.non_member_price}
                onChange={(e) => setRules({ ...rules, multiactivity: { ...m, non_member_price: Number(e.target.value) } })}
                className="h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
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
          <p className="font-medium text-sm">Regles de quota guardades!</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-3 shadow-sm shadow-primary/30 transition-all disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save size={20} /> Guardar regles</>}
      </button>
    </div>
  );
}
