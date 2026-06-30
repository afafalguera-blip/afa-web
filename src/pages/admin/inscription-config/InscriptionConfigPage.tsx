import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Save, CalendarRange, FileText, ListChecks, CheckCircle2, AlertCircle } from 'lucide-react';
import { ConfigService, type InscriptionFormConfig } from '../../../services/ConfigService';
import { TranslationService } from '../../../services/TranslationService';
import SeasonSettings from '../settings/SeasonSettings';
import { TextosTab } from './TextosTab';
import { CampsTab } from './CampsTab';

type Tab = 'temporada' | 'textos' | 'camps';
type Lang = 'ca' | 'es' | 'en';

const DEFAULT_CFG: InscriptionFormConfig = {
  content: { ca: {}, es: {}, en: {} },
  fields: [
    { key: 'parent_dni', enabled: true, required: true, label: { ca: '', es: '', en: '' } },
    { key: 'parent_phone_2', enabled: true, required: false, label: { ca: '', es: '', en: '' } },
    { key: 'parent_email_2', enabled: true, required: false, label: { ca: '', es: '', en: '' } },
    { key: 'health_info', enabled: true, required: false, label: { ca: '', es: '', en: '' } },
    { key: 'image_rights', enabled: true, required: true, label: { ca: '', es: '', en: '' } },
    { key: 'leave_alone', enabled: true, required: true, label: { ca: '', es: '', en: '' } },
  ],
  customQuestions: [],
};

export default function InscriptionConfigPage() {
  const [tab, setTab] = useState<Tab>('temporada');
  const [cfg, setCfg] = useState<InscriptionFormConfig | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>('ca');
  const [lockedKeys, setLockedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ConfigService.getInscriptionFormConfig().then(c => {
      const merged = c ? { ...DEFAULT_CFG, ...c, content: { ...DEFAULT_CFG.content, ...c.content } } : DEFAULT_CFG;
      // ensure all 6 known fields exist (in case config predates one)
      const byKey = new Map(merged.fields.map(f => [f.key, f]));
      merged.fields = DEFAULT_CFG.fields.map(d => byKey.get(d.key) ?? d);
      setCfg(merged);
      setLockedKeys(new Set((merged.customQuestions || []).map(q => q.key).filter(Boolean)));
      setLoading(false);
    });
  }, []);

  // Auto-translate (like the news editor): fields filled in the active language
  // are translated into the other two, only where the target is still empty.
  const autoTranslateContent = async (
    content: InscriptionFormConfig['content'],
  ): Promise<InscriptionFormConfig['content']> => {
    const src = content[activeLang] as Record<string, string>;
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(src)) {
      if (typeof v === 'string' && v.trim()) fields[k] = v;
    }
    if (Object.keys(fields).length === 0) return content;

    const targets = (['ca', 'es', 'en'] as Lang[]).filter(l => l !== activeLang);
    const result = await TranslationService.translateBulk(fields, activeLang, targets);
    const next = { ca: { ...content.ca }, es: { ...content.es }, en: { ...content.en } };
    for (const lang of targets) {
      const block = next[lang] as Record<string, string>;
      for (const k of Object.keys(fields)) {
        if (!block[k] || !block[k].trim()) block[k] = result[lang]?.[k] || '';
      }
    }
    return next;
  };

  const handleSave = async () => {
    if (!cfg) return;
    setSaving(true); setSuccess(false); setError(null);
    try {
      // dedupe custom-question keys
      const keys = cfg.customQuestions.map(q => q.key);
      if (keys.some(k => !k)) throw new Error('Hi ha preguntes sense clau.');
      if (new Set(keys).size !== keys.length) throw new Error('Hi ha claus de pregunta duplicades.');

      // Auto-fill the other languages from the active one before saving.
      let content = cfg.content;
      try {
        content = await autoTranslateContent(cfg.content);
        if (content !== cfg.content) setCfg({ ...cfg, content });
      } catch (txErr) {
        console.error('Auto-translate failed, saving without translations:', txErr);
      }

      await ConfigService.updateInscriptionFormConfig({ ...cfg, content });
      setLockedKeys(new Set(keys));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error en desar.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = useMemo(() => ([
    { id: 'temporada' as Tab, icon: CalendarRange, label: 'Temporada' },
    { id: 'textos' as Tab, icon: FileText, label: 'Textos' },
    { id: 'camps' as Tab, icon: ListChecks, label: 'Camps' },
  ]), []);

  if (loading || !cfg) {
    return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800 dark:text-white flex items-center gap-3">
          <ClipboardList className="text-primary w-8 h-8" /> Configuració d'Inscripcions
        </h1>
        <p className="text-neutral-500 text-sm mt-1">Obre/tanca el període, edita els textos i els camps del formulari públic.</p>
      </div>

      <div className="flex flex-wrap p-1 bg-neutral-200/50 dark:bg-neutral-800/50 rounded-lg mb-8 gap-1">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all text-sm ${tab === id ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-600' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'temporada' && <SeasonSettings />}

      {tab === 'textos' && (
        <TextosTab content={cfg.content} setContent={content => setCfg({ ...cfg, content })} activeLang={activeLang} setActiveLang={setActiveLang} />
      )}

      {tab === 'camps' && (
        <CampsTab
          fields={cfg.fields} setFields={fields => setCfg({ ...cfg, fields })}
          customQuestions={cfg.customQuestions} setCustomQuestions={customQuestions => setCfg({ ...cfg, customQuestions })}
          activeLang={activeLang} setActiveLang={setActiveLang} lockedKeys={lockedKeys}
        />
      )}

      {/* Save (not for the self-saving Temporada tab) */}
      {tab !== 'temporada' && (
        <div className="mt-6 space-y-4">
          {error && <div className="flex items-center gap-3 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg"><AlertCircle size={20} /><p className="font-medium text-sm">{error}</p></div>}
          {success && <div className="flex items-center gap-3 p-4 bg-green-100 border border-green-200 text-green-700 rounded-lg"><CheckCircle2 size={20} /><p className="font-medium text-sm">Desat correctament!</p></div>}
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-3 shadow-sm shadow-primary/30 transition-all disabled:opacity-50">
            {saving ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={20} /> Guardar Canvis</>}
          </button>
        </div>
      )}
    </div>
  );
}
