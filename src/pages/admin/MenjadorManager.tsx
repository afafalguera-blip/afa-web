import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Plus, Trash2, AlertCircle, FileText, Upload, Eye, EyeOff, Info, ListOrdered, Utensils, Search } from 'lucide-react';
import {
  AdminMenjadorService,
  newMenjadorDraftId,
  type AdminMenjadorMenu,
  type AdminMenjadorRate,
  type AdminMenjadorRateDraft,
} from '../../services/admin/AdminMenjadorService';
import { ConfigService, type MenjadorInfoBlock, type MenjadorInfoConfig } from '../../services/ConfigService';
import { proxyStorageUrl } from '../../utils/storageUrl';
import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { useDirtyGuard } from '../../hooks/useDirtyGuard';

type Tab = 'info' | 'rates' | 'menus';
type Lang = 'ca' | 'es' | 'en';

const EMPTY_BLOCK: MenjadorInfoBlock = {
  intro: '', schedule: '', company: '', allergies: '', diets: '', how_to: '', contact: '',
};

const EMPTY_INFO: MenjadorInfoConfig = {
  translations: { ca: { ...EMPTY_BLOCK }, es: { ...EMPTY_BLOCK }, en: { ...EMPTY_BLOCK } },
};

const FIELD_ROWS: { key: keyof MenjadorInfoBlock; rows: number }[] = [
  { key: 'intro', rows: 4 },
  { key: 'schedule', rows: 2 },
  { key: 'company', rows: 2 },
  { key: 'how_to', rows: 4 },
  { key: 'allergies', rows: 3 },
  { key: 'diets', rows: 3 },
  { key: 'contact', rows: 2 },
];

const FIELD_LABEL_KEYS: Record<keyof MenjadorInfoBlock, { key: string; fallback: string }> = {
  intro: { key: 'admin.menjador.field.intro', fallback: 'Introducció' },
  schedule: { key: 'admin.menjador.field.schedule', fallback: 'Horari' },
  company: { key: 'admin.menjador.field.company', fallback: 'Empresa proveïdora' },
  allergies: { key: 'admin.menjador.field.allergies', fallback: 'Al·lèrgies i intoleràncies' },
  diets: { key: 'admin.menjador.field.diets', fallback: 'Dietes especials' },
  how_to: { key: 'admin.menjador.field.how_to', fallback: "Com s'utilitza" },
  contact: { key: 'admin.menjador.field.contact', fallback: 'Contacte' },
};

const PRIMARY_BTN =
  'flex items-center gap-2 px-4 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-white text-[13px] font-medium transition-colors disabled:opacity-50';

export default function MenjadorManager() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('info');
  // Each tab reports its own dirty state so switching away can warn first.
  const [dirtyTabs, setDirtyTabs] = useState<Record<Tab, boolean>>({ info: false, rates: false, menus: false });

  const setTabDirty = useCallback((which: Tab, dirty: boolean) => {
    setDirtyTabs(prev => (prev[which] === dirty ? prev : { ...prev, [which]: dirty }));
  }, []);

  const { confirmDiscard } = useDirtyGuard(dirtyTabs[tab]);

  const requestTab = async (next: Tab) => {
    if (next === tab) return;
    if (!(await confirmDiscard())) return;
    setTabDirty(tab, false);
    setTab(next);
  };

  return (
    <div className="p-2 md:p-6 max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title={t('admin.menjador.title', 'Gestió Menjador')}
        subtitle={t('admin.menjador.subtitle', 'Informació del servei, tarifes i menús mensuals.')}
        icon={Utensils}
      />

      <nav className="flex gap-2 border-b border-neutral-200 overflow-x-auto">
        <TabButton active={tab === 'info'} onClick={() => requestTab('info')} icon={<Info size={16} />}>
          {t('admin.menjador.tab_info', 'Informació')}
        </TabButton>
        <TabButton active={tab === 'rates'} onClick={() => requestTab('rates')} icon={<ListOrdered size={16} />}>
          {t('admin.menjador.tab_rates', 'Tarifes')}
        </TabButton>
        <TabButton active={tab === 'menus'} onClick={() => requestTab('menus')} icon={<FileText size={16} />}>
          {t('admin.menjador.tab_menus', 'Menús')}
        </TabButton>
      </nav>

      {tab === 'info' && <InfoTab onDirtyChange={dirty => setTabDirty('info', dirty)} />}
      {tab === 'rates' && <RatesTab onDirtyChange={dirty => setTabDirty('rates', dirty)} />}
      {tab === 'menus' && <MenusTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors whitespace-nowrap ${
        active ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-800'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg bg-white text-[13px] outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
    </div>
  );
}

// ============================================================
// INFO TAB
// ============================================================
function InfoTab({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [config, setConfig] = useState<MenjadorInfoConfig>(EMPTY_INFO);
  const [activeLang, setActiveLang] = useState<Lang>('ca');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState(() => JSON.stringify(EMPTY_INFO));

  useEffect(() => {
    (async () => {
      try {
        const data = await ConfigService.getMenjadorInfoConfig();
        if (data) {
          const merged: MenjadorInfoConfig = {
            translations: {
              ca: { ...EMPTY_BLOCK, ...data.translations?.ca },
              es: { ...EMPTY_BLOCK, ...data.translations?.es },
              en: { ...EMPTY_BLOCK, ...data.translations?.en },
            },
          };
          setBaseline(JSON.stringify(merged));
          setConfig(merged);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isDirty = JSON.stringify(config) !== baseline;
  useEffect(() => { onDirtyChange(isDirty); }, [isDirty, onDirtyChange]);

  const handleChange = (field: keyof MenjadorInfoBlock, value: string) => {
    setConfig(prev => ({
      translations: {
        ...prev.translations,
        [activeLang]: { ...prev.translations[activeLang], [field]: value },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await ConfigService.upsertMenjadorInfoConfig(config);
      setBaseline(JSON.stringify(config));
      onDirtyChange(false);
      toast.success(t('admin.menjador.info_saved', 'Textos desats'));
    } catch (e) {
      console.error(e);
      const message = (e as Error).message ?? t('common.error_save');
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const block = config.translations[activeLang];

  return (
    <section className="bg-white rounded-lg border border-neutral-200 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <LangSwitch value={activeLang} onChange={setActiveLang} />
        <div className="flex items-center gap-3">
          {isDirty && <span className="text-[13px] text-amber-700">{t('admin.unsaved.banner', 'Tens canvis sense desar.')}</span>}
          <button type="button" onClick={handleSave} disabled={saving} className={PRIMARY_BTN}>
            <Save className="w-4 h-4" /> {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <p className="text-xs text-neutral-500">
        {t('admin.menjador.info_hint', 'Edita els textos descriptius del servei de menjador. Cada idioma es desa per separat.')}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {FIELD_ROWS.map(({ key, rows }) => {
          const label = t(FIELD_LABEL_KEYS[key].key, FIELD_LABEL_KEYS[key].fallback);
          return (
            <div key={key} className={key === 'intro' || key === 'how_to' ? 'lg:col-span-2' : ''}>
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1" htmlFor={`menjador-${key}`}>
                {label}
              </label>
              <textarea
                id={`menjador-${key}`}
                value={block[key]}
                onChange={e => handleChange(key, e.target.value)}
                rows={rows}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-sm"
                placeholder={label}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LangSwitch({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg">
      {(['ca', 'es', 'en'] as Lang[]).map(l => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          aria-pressed={value === l}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg uppercase ${
            value === l ? 'bg-white text-neutral-900 shadow' : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// RATES TAB
// ============================================================
function RatesTab({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [rates, setRates] = useState<AdminMenjadorRateDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>('ca');
  const [search, setSearch] = useState('');

  // Ids present in the DB when the tab loaded: the only rows saveRates may delete.
  const loadedIds = useRef<string[]>([]);
  const [baseline, setBaseline] = useState('[]');

  const applyLoaded = (data: AdminMenjadorRate[]) => {
    loadedIds.current = data.map(r => r.id);
    setBaseline(JSON.stringify(data));
    setRates(data);
  };

  useEffect(() => {
    (async () => {
      try {
        applyLoaded(await AdminMenjadorService.getAllRates());
      } catch (e) {
        console.error(e);
        setError(t('admin.menjador.error_rates', 'Error en carregar les tarifes'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const isDirty = JSON.stringify(rates) !== baseline;
  useEffect(() => { onDirtyChange(isDirty); }, [isDirty, onDirtyChange]);

  const handleAdd = (rateType: 'fix' | 'esporadic') => {
    setRates(prev => [
      ...prev,
      {
        id: newMenjadorDraftId(),
        label: '',
        label_ca: '',
        label_es: '',
        label_en: '',
        rate_type: rateType,
        preu_soci: '',
        preu_no_soci: '',
        note: '',
        note_ca: '',
        note_es: '',
        note_en: '',
        order_index: prev.length,
      },
    ]);
    setSearch('');
  };

  const handleRemove = async (rate: AdminMenjadorRateDraft) => {
    const name = rate.label_ca || rate.label_es || rate.label_en || rate.label;
    const ok = await confirm({
      title: t('admin.menjador.delete_rate_title', 'Eliminar tarifa'),
      message: t('admin.menjador.delete_rate_message', "La tarifa s'eliminarà en desar els canvis."),
      itemName: name || t('admin.menjador.untitled_rate', 'Tarifa sense etiqueta'),
      destructive: true,
    });
    if (!ok) return;
    setRates(prev => prev.filter(r => r.id !== rate.id));
  };

  const handleChange = <K extends keyof AdminMenjadorRateDraft>(id: string, field: K, value: AdminMenjadorRateDraft[K]) => {
    setRates(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      applyLoaded(await AdminMenjadorService.saveRates(rates, loadedIds.current));
      onDirtyChange(false);
      toast.success(t('admin.menjador.rates_saved', 'Tarifes desades'));
    } catch (e) {
      console.error(e);
      const message = (e as Error).message ?? t('common.error_save');
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const visibleRates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rates;
    return rates.filter(r =>
      [r.label, r.label_ca, r.label_es, r.label_en, r.preu_soci, r.preu_no_soci, r.note_ca, r.note_es, r.note_en]
        .some(v => (v ?? '').toLowerCase().includes(term))
    );
  }, [rates, search]);

  if (loading) return <Loading />;

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-800">{t('admin.menjador.rates_title', 'Tarifes')}</h2>
            <p className="text-xs text-neutral-500">{t('admin.menjador.rates_hint', 'Distingim entre alumnat fix (mig mes o més + 1 dia) i esporàdic (dies solts).')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <LangSwitch value={activeLang} onChange={setActiveLang} />
            {isDirty && <span className="text-[13px] text-amber-700">{t('admin.unsaved.banner', 'Tens canvis sense desar.')}</span>}
            <button type="button" onClick={handleSave} disabled={saving} className={PRIMARY_BTN}>
              <Save className="w-4 h-4" /> {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder={t('admin.menjador.search_rates', 'Cerca per etiqueta o preu...')} />
        </div>

        {error && <ErrorBanner message={error} />}

        <RateGroup
          title={t('admin.menjador.group_fix', 'Alumnat fix')}
          subtitle={t('admin.menjador.group_fix_hint', 'Mig mes o més + 1 dia')}
          rates={visibleRates}
          rateType="fix"
          activeLang={activeLang}
          onAdd={() => handleAdd('fix')}
          onChange={handleChange}
          onRemove={handleRemove}
        />

        <div className="h-px bg-neutral-100 my-6" />

        <RateGroup
          title={t('admin.menjador.group_sporadic', 'Alumnat esporàdic')}
          subtitle={t('admin.menjador.group_sporadic_hint', 'Dies solts')}
          rates={visibleRates}
          rateType="esporadic"
          activeLang={activeLang}
          onAdd={() => handleAdd('esporadic')}
          onChange={handleChange}
          onRemove={handleRemove}
        />
      </div>
    </section>
  );
}

interface RateGroupProps {
  title: string;
  subtitle: string;
  rates: AdminMenjadorRateDraft[];
  rateType: 'fix' | 'esporadic';
  activeLang: Lang;
  onAdd: () => void;
  onChange: <K extends keyof AdminMenjadorRateDraft>(id: string, field: K, value: AdminMenjadorRateDraft[K]) => void;
  onRemove: (rate: AdminMenjadorRateDraft) => void;
}

function RateGroup({ title, subtitle, rates, rateType, activeLang, onAdd, onChange, onRemove }: RateGroupProps) {
  const { t } = useTranslation();
  const labelKey = `label_${activeLang}` as keyof AdminMenjadorRateDraft;
  const noteKey = `note_${activeLang}` as keyof AdminMenjadorRateDraft;
  const groupRates = rates.filter(r => r.rate_type === rateType);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-neutral-700 text-sm">{title}</h3>
          <p className="text-xs text-neutral-400">{subtitle}</p>
        </div>
        <button type="button" onClick={onAdd} className="text-xs font-bold text-neutral-700 hover:text-neutral-900 flex items-center gap-1">
          <Plus size={14} /> {t('admin.menjador.add_rate', 'Afegir tarifa')}
        </button>
      </div>

      <div className="space-y-3">
        {groupRates.map(rate => (
          <div key={rate.id} className="bg-neutral-50 rounded-lg p-4 border border-neutral-100 space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="text"
                value={(rate[labelKey] as string) ?? ''}
                onChange={e => onChange(rate.id!, labelKey, e.target.value as AdminMenjadorRateDraft[typeof labelKey])}
                placeholder={`${t('admin.menjador.label', 'Etiqueta')} (${activeLang.toUpperCase()})`}
                aria-label={`${t('admin.menjador.label', 'Etiqueta')} (${activeLang.toUpperCase()})`}
                className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-sm"
              />
              <button
                type="button"
                onClick={() => onRemove(rate)}
                className="p-2 text-neutral-400 hover:text-red-600"
                title={t('common.delete')}
                aria-label={t('common.delete')}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  {t('admin.menjador.price_member', 'Preu soci')}
                </label>
                <input
                  type="text"
                  value={rate.preu_soci}
                  onChange={e => onChange(rate.id!, 'preu_soci', e.target.value)}
                  placeholder="6,80 €/dia"
                  aria-label={t('admin.menjador.price_member', 'Preu soci')}
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  {t('admin.menjador.price_non_member', 'Preu no soci')}
                </label>
                <input
                  type="text"
                  value={rate.preu_no_soci}
                  onChange={e => onChange(rate.id!, 'preu_no_soci', e.target.value)}
                  placeholder="7,20 €/dia"
                  aria-label={t('admin.menjador.price_non_member', 'Preu no soci')}
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                {t('admin.menjador.note', 'Nota')} ({activeLang.toUpperCase()})
              </label>
              <textarea
                value={(rate[noteKey] as string) ?? ''}
                onChange={e => onChange(rate.id!, noteKey, e.target.value as AdminMenjadorRateDraft[typeof noteKey])}
                placeholder={t('admin.menjador.note_placeholder', 'Aclariment opcional')}
                rows={2}
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-sm"
              />
            </div>
          </div>
        ))}
        {groupRates.length === 0 && (
          <p className="text-sm text-neutral-400 italic text-center py-4">{t('admin.menjador.no_rates', 'Sense tarifes')}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MENUS TAB
// ============================================================
function MenusTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [menus, setMenus] = useState<AdminMenjadorMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    try {
      setMenus(await AdminMenjadorService.getAllMenus());
    } catch (e) {
      console.error(e);
      setError(t('admin.menjador.error_menus', 'Error en carregar els menús'));
    }
  }, [t]);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const handleToggle = async (menu: AdminMenjadorMenu) => {
    try {
      await AdminMenjadorService.toggleMenuActive(menu.id, !menu.is_active);
      await refresh();
      toast.success(menu.is_active
        ? t('admin.menjador.menu_hidden', 'Menú ocult al públic')
        : t('admin.menjador.menu_shown', 'Menú visible al públic'));
    } catch (e) {
      console.error(e);
      toast.error(t('admin.menjador.error_toggle', "No s'ha pogut actualitzar l'estat"));
    }
  };

  const handleDelete = async (menu: AdminMenjadorMenu) => {
    const ok = await confirm({
      title: t('admin.menjador.delete_menu_title', 'Eliminar menú'),
      message: t('admin.menjador.delete_menu_message', 'Aquesta acció no es pot desfer.'),
      itemName: menu.title,
      destructive: true,
    });
    if (!ok) return;
    try {
      await AdminMenjadorService.deleteMenu(menu);
      await refresh();
      toast.success(t('admin.menjador.menu_deleted', 'Menú eliminat'));
    } catch (e) {
      console.error(e);
      toast.error(t('common.error_delete'));
    }
  };

  const visibleMenus = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return menus;
    return menus.filter(m =>
      m.title.toLowerCase().includes(term) ||
      formatPeriodAdmin(m.month, m.year).toLowerCase().includes(term)
    );
  }, [menus, search]);

  if (loading) return <Loading />;

  return (
    <section className="bg-white rounded-lg border border-neutral-200 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-neutral-800">{t('admin.menjador.menus_title', 'Menús publicats')}</h2>
          <p className="text-xs text-neutral-500">{t('admin.menjador.menus_hint', 'Puja els menús mensuals en PDF. Només es mostren al públic els actius.')}</p>
        </div>
        <button type="button" onClick={() => setShowUpload(true)} className={PRIMARY_BTN}>
          <Upload className="w-4 h-4" /> {t('admin.menjador.upload_menu', 'Pujar menú')}
        </button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder={t('admin.menjador.search_menus', 'Cerca per títol o període...')} />

      {error && <ErrorBanner message={error} />}

      {visibleMenus.length === 0 ? (
        <div className="bg-neutral-50 rounded-lg p-8 text-center border border-dashed border-neutral-200">
          <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-neutral-500 text-sm">
            {search ? t('common.no_results', 'Sense resultats') : t('admin.menjador.no_menus', 'No hi ha menús pujats.')}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {visibleMenus.map(menu => (
            <li key={menu.id} className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 bg-neutral-100 text-neutral-600 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-neutral-800 text-sm truncate">{menu.title}</p>
                <p className="text-xs text-neutral-500">
                  {formatPeriodAdmin(menu.month, menu.year)} · {(menu.size_bytes ?? 0) > 0 ? `${((menu.size_bytes ?? 0) / 1024 / 1024).toFixed(1)} MB · ` : ''}
                  <a href={proxyStorageUrl(menu.file_url)} target="_blank" rel="noopener noreferrer" className="text-neutral-900 underline hover:no-underline">
                    {t('admin.menjador.open_pdf', 'Obrir PDF')}
                  </a>
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(menu)}
                title={menu.is_active ? t('admin.menjador.hide', 'Ocultar al públic') : t('admin.menjador.show', 'Mostrar al públic')}
                aria-label={menu.is_active ? t('admin.menjador.hide', 'Ocultar al públic') : t('admin.menjador.show', 'Mostrar al públic')}
                className={`p-2 rounded-lg ${menu.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-neutral-400 hover:bg-neutral-100'}`}
              >
                {menu.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(menu)}
                title={t('common.delete')}
                aria-label={t('common.delete')}
                className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <UploadMenuModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={async () => {
          setShowUpload(false);
          await refresh();
          toast.success(t('admin.menjador.menu_uploaded', 'Menú pujat'));
        }}
      />
    </section>
  );
}

const MONTH_NAMES = [
  'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre',
];

function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

function formatPeriodAdmin(month: number | null, year: number | null): string {
  if (!month && !year) return '—';
  if (month && year) return `${monthName(month)} ${year}`;
  if (year) return String(year);
  if (month) return monthName(month);
  return '—';
}

function UploadMenuModal({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded: () => void }) {
  const { t } = useTranslation();
  const today = new Date();
  const [title, setTitle] = useState('');
  const [month, setMonth] = useState<number | ''>(today.getMonth() + 1);
  const [year, setYear] = useState<number | ''>(today.getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.type !== 'application/pdf') {
      setError(t('admin.menjador.only_pdf', 'Només s\'admeten fitxers PDF'));
      return;
    }
    setFile(f);
    if (!title) {
      const m = month && Number(month) >= 1 && Number(month) <= 12 ? monthName(Number(month)) : '';
      setTitle(`${t('admin.menjador.menu_word', 'Menú')} ${m}${year ? ` ${year}` : ''}`.trim());
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError(t('admin.menjador.select_pdf', 'Selecciona un fitxer PDF'));
      return;
    }
    if (!title.trim()) {
      setError(t('admin.menjador.need_title', 'Indica un títol'));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await AdminMenjadorService.uploadMenu({
        title: title.trim(),
        month: typeof month === 'number' ? month : null,
        year: typeof year === 'number' ? year : null,
        file,
      });
      setTitle('');
      setFile(null);
      onUploaded();
    } catch (e) {
      console.error(e);
      setError((e as Error).message ?? t('common.error_save'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={uploading ? () => {} : onClose}
      title={t('admin.menjador.upload_menu', 'Pujar menú')}
      size="md"
      closeOnBackdrop={!uploading}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button type="button" onClick={handleSubmit} disabled={uploading || !file} className={PRIMARY_BTN}>
            <Upload className="w-4 h-4" />
            {uploading ? t('common.uploading', 'Pujant...') : t('admin.menjador.upload', 'Pujar')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <div>
          <label htmlFor="menu-title" className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
            {t('admin.menjador.menu_title_field', 'Títol')}
          </label>
          <input
            id="menu-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="menu-month" className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
              {t('admin.menjador.month', 'Mes')}
            </label>
            <select
              id="menu-month"
              value={month}
              onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-sm"
            >
              <option value="">{t('admin.menjador.no_month', '— Sense mes —')}</option>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="menu-year" className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
              {t('admin.menjador.year', 'Any')}
            </label>
            <input
              id="menu-year"
              type="number"
              min={2020}
              max={2100}
              value={year}
              onChange={e => setYear(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="menu-file" className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
            {t('admin.menjador.pdf_field', 'Fitxer PDF (màx. 15 MB)')}
          </label>
          <input
            id="menu-file"
            type="file"
            accept="application/pdf"
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-neutral-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200"
          />
          {file && <p className="text-xs text-neutral-500 mt-1">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// SHARED
// ============================================================
function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-center gap-3 border border-red-200">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
