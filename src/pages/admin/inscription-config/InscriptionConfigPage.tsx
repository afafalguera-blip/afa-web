import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Save, CalendarRange, FileText, ListChecks, Loader2 } from 'lucide-react';
import { ConfigService, type InscriptionFormConfig } from '../../../services/ConfigService';
import { TranslationService } from '../../../services/TranslationService';
import SeasonSettings from '../settings/SeasonSettings';
import { useSettingsT } from '../settings/useSettingsT';
import { AdminPageHeader } from '../../../components/admin/common/AdminPageHeader';
import { useToast } from '../../../components/common/Toast';
import { useDirtyGuard } from '../../../hooks/useDirtyGuard';
import { TextosTab } from './TextosTab';
import { CampsTab } from './CampsTab';

type Tab = 'temporada' | 'textos' | 'camps';
type Lang = 'ca' | 'es' | 'en';

interface TabDef {
  id: Tab;
  icon: LucideIcon;
  labelKey: string;
  labelDefault: string;
  /** Panel owns its save button (Temporada saves itself). */
  selfManaged?: boolean;
}

const TABS: TabDef[] = [
  { id: 'temporada', icon: CalendarRange, labelKey: 'admin.inscription_config.tabs.season', labelDefault: 'Temporada', selfManaged: true },
  { id: 'textos', icon: FileText, labelKey: 'admin.inscription_config.tabs.texts', labelDefault: 'Textos' },
  { id: 'camps', icon: ListChecks, labelKey: 'admin.inscription_config.tabs.fields', labelDefault: 'Camps' },
];

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
  const t = useSettingsT();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('temporada');
  const [cfg, setCfg] = useState<InscriptionFormConfig | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>('ca');
  const [lockedKeys, setLockedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { confirmDiscard } = useDirtyGuard(dirty);

  useEffect(() => {
    ConfigService.getInscriptionFormConfig()
      .then(c => {
        const merged = c ? { ...DEFAULT_CFG, ...c, content: { ...DEFAULT_CFG.content, ...c.content } } : DEFAULT_CFG;
        // ensure all 6 known fields exist (in case config predates one)
        const byKey = new Map(merged.fields.map(f => [f.key, f]));
        merged.fields = DEFAULT_CFG.fields.map(d => byKey.get(d.key) ?? d);
        setCfg(merged);
        setLockedKeys(new Set((merged.customQuestions || []).map(q => q.key).filter(Boolean)));
      })
      .catch(err => {
        console.error(err);
        toast.error(t('admin.inscription_config.load_error', 'Error carregant la configuració del formulari'));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Applies a config change and flags the page as dirty. */
  const patchCfg = (next: InscriptionFormConfig) => {
    setCfg(next);
    setDirty(true);
  };

  const handleTabChange = async (id: Tab) => {
    if (id === tab) return;
    if (!(await confirmDiscard())) return;
    setDirty(false);
    setTab(id);
  };

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
    setSaving(true);
    try {
      // dedupe custom-question keys
      const keys = cfg.customQuestions.map(q => q.key);
      if (keys.some(k => !k)) throw new Error(t('admin.inscription_config.missing_key', 'Hi ha preguntes sense clau.'));
      if (new Set(keys).size !== keys.length) throw new Error(t('admin.inscription_config.duplicate_key', 'Hi ha claus de pregunta duplicades.'));

      // Auto-fill the other languages from the active one before saving.
      let content = cfg.content;
      try {
        content = await autoTranslateContent(cfg.content);
        if (content !== cfg.content) setCfg({ ...cfg, content });
      } catch (txErr) {
        console.error('Auto-translate failed, saving without translations:', txErr);
        toast.info(t('admin.inscription_config.translate_skipped', "No s'ha pogut traduir automàticament; es desa sense traduccions."));
      }

      await ConfigService.updateInscriptionFormConfig({ ...cfg, content });
      setLockedKeys(new Set(keys));
      setDirty(false);
      toast.success(t('admin.inscription_config.saved', 'Configuració desada correctament'));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t('admin.inscription_config.save_error', 'Error en desar.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !cfg) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const activeDef = TABS.find(x => x.id === tab)!;
  const panelId = `inscription-config-panel-${tab}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <AdminPageHeader
        title={t('admin.inscription_config.title', "Configuració d'inscripcions")}
        subtitle={t('admin.inscription_config.subtitle', 'Obre/tanca el període, edita els textos i els camps del formulari públic.')}
        icon={ClipboardList}
      />

      <div
        role="tablist"
        aria-label={t('admin.inscription_config.title', "Configuració d'inscripcions")}
        className="flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-white p-2"
      >
        {TABS.map(({ id, icon: Icon, labelKey, labelDefault }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={selected ? panelId : undefined}
              onClick={() => handleTabChange(id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-medium transition-colors ${selected
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
                }`}
            >
              <Icon size={15} aria-hidden="true" /> {t(labelKey, labelDefault)}
            </button>
          );
        })}
      </div>

      <div id={panelId} role="tabpanel" className="space-y-6">
        {tab === 'temporada' && <SeasonSettings onDirtyChange={setDirty} />}

        {tab === 'textos' && (
          <TextosTab
            content={cfg.content}
            setContent={content => patchCfg({ ...cfg, content })}
            activeLang={activeLang}
            setActiveLang={setActiveLang}
          />
        )}

        {tab === 'camps' && (
          <CampsTab
            fields={cfg.fields}
            setFields={fields => patchCfg({ ...cfg, fields })}
            customQuestions={cfg.customQuestions}
            setCustomQuestions={customQuestions => patchCfg({ ...cfg, customQuestions })}
            activeLang={activeLang}
            setActiveLang={setActiveLang}
            lockedKeys={lockedKeys}
          />
        )}

        {!activeDef.selfManaged && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save size={16} /> {t('common.save', 'Guardar canvis')}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
