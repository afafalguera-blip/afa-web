import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Save,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  Users,
  ArrowUp,
  ArrowDown,
  Search,
  Languages,
} from 'lucide-react';
import {
  BoardService,
  type BoardMember,
  type BoardMemberInput,
  type BoardRoleKey,
  type BoardSectionConfig,
} from '../../services/BoardService';
import { TranslationService } from '../../services/TranslationService';
import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { useDirtyGuard } from '../../hooks/useDirtyGuard';

const ROLE_KEYS: { value: BoardRoleKey; labelKey: string; fallback: string }[] = [
  { value: 'president', labelKey: 'admin.board.role.president', fallback: 'President/a' },
  { value: 'vicepresident', labelKey: 'admin.board.role.vicepresident', fallback: 'Vicepresident/a' },
  { value: 'treasurer', labelKey: 'admin.board.role.treasurer', fallback: 'Tresorer/a' },
  { value: 'secretary', labelKey: 'admin.board.role.secretary', fallback: 'Secretari/ària' },
  { value: 'vocal', labelKey: 'admin.board.role.vocal', fallback: 'Vocal' },
];

const LANGS = ['ca', 'es', 'en'] as const;
type Lang = typeof LANGS[number];

const PRIMARY_BTN =
  'flex items-center gap-2 px-4 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-white text-[13px] font-medium transition-colors disabled:opacity-50';

const SECONDARY_BTN =
  'px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50';

interface FormState {
  id?: string;
  name: string;
  role_key: BoardRoleKey;
  email: string;
  is_visible: boolean;
  photo_url: string;
  translations: Record<Lang, { role: string; bio: string }>;
}

const emptyForm = (): FormState => ({
  name: '',
  role_key: 'vocal',
  email: '',
  is_visible: true,
  photo_url: '',
  translations: {
    ca: { role: '', bio: '' },
    es: { role: '', bio: '' },
    en: { role: '', bio: '' },
  },
});

export default function BoardManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [members, setMembers] = useState<BoardMember[]>([]);
  const [config, setConfig] = useState<BoardSectionConfig>({ translations: { ca: undefined, es: undefined, en: undefined } });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [translatingConfig, setTranslatingConfig] = useState(false);
  const [translatingMember, setTranslatingMember] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formBaseline, setFormBaseline] = useState<string>(JSON.stringify(emptyForm()));
  const [activeLang, setActiveLang] = useState<Lang>('es');
  const [activeConfigLang, setActiveConfigLang] = useState<Lang>('es');
  const [search, setSearch] = useState('');

  const [configBaseline, setConfigBaseline] = useState<string>(() => JSON.stringify({ translations: {} }));

  const roleLabel = (key: BoardRoleKey) => {
    const entry = ROLE_KEYS.find(r => r.value === key);
    return entry ? t(entry.labelKey, entry.fallback) : key;
  };

  const configDirty = JSON.stringify(config) !== configBaseline;
  const formDirty = showForm && JSON.stringify(form) !== formBaseline;
  const { confirmDiscard } = useDirtyGuard(configDirty || formDirty);

  const load = async () => {
    setLoading(true);
    try {
      const [list, cfg] = await Promise.all([
        BoardService.listAll(),
        BoardService.getSectionConfig(),
      ]);
      setMembers(list);
      const nextConfig = cfg ?? { translations: {} };
      setConfigBaseline(JSON.stringify(nextConfig));
      setConfig(nextConfig);
    } catch (e) {
      console.error(e);
      toast.error(t('admin.board.error_load', 'Error carregant les dades'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openForm = (state: FormState) => {
    setForm(state);
    setFormBaseline(JSON.stringify(state));
    setActiveLang('es');
    setShowForm(true);
  };

  const startCreate = () => openForm(emptyForm());

  const startEdit = (m: BoardMember) => {
    const tr = m.translations || {};
    openForm({
      id: m.id,
      name: m.name,
      role_key: m.role_key,
      email: m.email ?? '',
      is_visible: m.is_visible,
      photo_url: m.photo_url ?? '',
      translations: {
        ca: { role: tr.ca?.role ?? '', bio: tr.ca?.bio ?? '' },
        es: { role: tr.es?.role ?? m.role ?? '', bio: tr.es?.bio ?? m.bio ?? '' },
        en: { role: tr.en?.role ?? '', bio: tr.en?.bio ?? '' },
      },
    });
  };

  const closeForm = async () => {
    if (formDirty && !(await confirmDiscard())) return;
    setShowForm(false);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await BoardService.uploadPhoto(file);
      setForm(f => ({ ...f, photo_url: url }));
    } catch (e) {
      console.error(e);
      toast.error(t('admin.board.error_upload', 'Error pujant la imatge'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim()) {
      toast.error(t('admin.board.name_required', 'El nom és obligatori'));
      return;
    }
    setSaving(true);
    try {
      const fallbackRole =
        form.translations.es.role || form.translations.ca.role || form.translations.en.role ||
        roleLabel(form.role_key);
      const fallbackBio = form.translations.es.bio || form.translations.ca.bio || form.translations.en.bio || null;

      const payload: BoardMemberInput = {
        name: form.name.trim(),
        role: fallbackRole,
        role_key: form.role_key,
        email: form.email.trim() || null,
        photo_url: form.photo_url || null,
        bio: fallbackBio,
        is_visible: form.is_visible,
        translations: form.translations,
      };

      if (form.id) {
        await BoardService.update(form.id, payload);
        toast.success(t('admin.board.member_updated', 'Membre actualitzat'));
      } else {
        const maxOrder = members.reduce((max, m) => Math.max(max, m.display_order), -1);
        await BoardService.create({ ...payload, display_order: maxOrder + 1 });
        toast.success(t('admin.board.member_created', 'Membre creat'));
      }
      setFormBaseline(JSON.stringify(form));
      setShowForm(false);
      await load();
    } catch (e) {
      console.error(e);
      toast.error(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: BoardMember) => {
    const ok = await confirm({
      title: t('admin.board.delete_title', 'Eliminar membre'),
      message: t('admin.board.delete_message', 'Aquesta acció no es pot desfer.'),
      itemName: m.name,
      destructive: true,
    });
    if (!ok) return;
    try {
      await BoardService.remove(m.id);
      toast.success(t('admin.board.member_deleted', 'Membre eliminat'));
      await load();
    } catch (e) {
      console.error(e);
      toast.error(t('common.error_delete'));
    }
  };

  const handleToggleVisible = async (m: BoardMember) => {
    try {
      await BoardService.update(m.id, { is_visible: !m.is_visible });
      await load();
    } catch (e) {
      console.error(e);
      toast.error(t('common.error_save'));
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= members.length) return;
    const reordered = [...members];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    setMembers(reordered);
    try {
      await BoardService.reorder(reordered.map(m => m.id));
    } catch (e) {
      console.error(e);
      toast.error(t('admin.board.error_reorder', 'Error reordenant'));
      await load();
    }
  };

  const handleAutoTranslateConfig = async () => {
    const source = config.translations?.[activeConfigLang];
    if (!source) {
      toast.error(t('admin.board.fill_source_first', "Omple primer els textos de l'idioma actiu"));
      return;
    }
    const fields: Record<string, string> = {
      title: source.title || '',
      subtitle: source.subtitle || '',
      mission: source.mission || '',
      composition_title: source.composition_title || '',
      composition_intro: source.composition_intro || '',
    };
    if (!Object.values(fields).some(v => v.trim())) {
      toast.error(t('admin.board.no_source_content', "No hi ha contingut en l'idioma actiu"));
      return;
    }
    setTranslatingConfig(true);
    try {
      const targets = LANGS.filter(l => l !== activeConfigLang);
      const result = await TranslationService.translateBulk(fields, activeConfigLang, [...targets]);
      const next = { ...config, translations: { ...(config.translations || {}) } };
      for (const lang of targets) {
        const r = result[lang] || {};
        next.translations![lang] = {
          title: r.title ?? fields.title,
          subtitle: r.subtitle ?? fields.subtitle,
          mission: r.mission ?? fields.mission,
          composition_title: r.composition_title ?? fields.composition_title,
          composition_intro: r.composition_intro ?? fields.composition_intro,
        };
      }
      setConfig(next);
      toast.success(t('admin.board.translations_ready', 'Traduccions generades — revisa i desa'));
    } catch (e) {
      console.error(e);
      toast.error(t('admin.board.error_translate', 'Error traduint (revisa VITE_TRANSLATION_PROXY_URL)'));
    } finally {
      setTranslatingConfig(false);
    }
  };

  const handleAutoTranslateMember = async () => {
    const source = form.translations[activeLang];
    const fields: Record<string, string> = {
      role: source.role || '',
      bio: source.bio || '',
    };
    if (!fields.role.trim() && !fields.bio.trim()) {
      toast.error(t('admin.board.no_source_content', "No hi ha contingut en l'idioma actiu"));
      return;
    }
    setTranslatingMember(true);
    try {
      const targets = LANGS.filter(l => l !== activeLang);
      const result = await TranslationService.translateBulk(fields, activeLang, [...targets]);
      setForm(f => {
        const next = { ...f, translations: { ...f.translations } };
        for (const lang of targets) {
          const r = result[lang] || {};
          next.translations[lang] = {
            role: r.role ?? next.translations[lang].role ?? fields.role,
            bio: r.bio ?? next.translations[lang].bio ?? fields.bio,
          };
        }
        return next;
      });
      toast.success(t('admin.board.translations_ready_short', 'Traduccions generades'));
    } catch (e) {
      console.error(e);
      toast.error(t('admin.board.error_translate_short', 'Error traduint'));
    } finally {
      setTranslatingMember(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await BoardService.updateSectionConfig(config);
      setConfigBaseline(JSON.stringify(config));
      toast.success(t('admin.board.config_saved', 'Textos actualitzats'));
    } catch (e) {
      console.error(e);
      toast.error(t('admin.board.error_config_save', 'Error desant els textos'));
    } finally {
      setSavingConfig(false);
    }
  };

  const setConfigField = (lang: Lang, field: keyof NonNullable<NonNullable<BoardSectionConfig['translations']>['es']>, value: string) => {
    setConfig(c => ({
      ...c,
      translations: {
        ...c.translations,
        [lang]: {
          title: '', subtitle: '', mission: '', composition_title: '', composition_intro: '',
          ...(c.translations?.[lang] || {}),
          [field]: value,
        },
      },
    }));
  };

  const visibleMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter(m =>
      [m.name, m.role, m.email ?? '', roleLabel(m.role_key)].some(v => v.toLowerCase().includes(term))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, search, t]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <AdminPageHeader
        title={t('admin.board.title', 'Sobre AFA / Junta Directiva')}
        subtitle={t('admin.board.subtitle', 'Configura els textos públics i els membres visibles a /sobre-afa.')}
        icon={Users}
        loading={loading}
        onRefresh={load}
        onCreate={startCreate}
        createLabel={t('admin.board.new_member', 'Nou membre')}
      />

      {/* Section copy */}
      <section className="bg-white rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-bold text-neutral-900 mb-1">{t('admin.board.page_texts', 'Textos de la pàgina')}</h2>
        <p className="text-sm text-neutral-500 mb-4">{t('admin.board.page_texts_hint', 'Hero i subtítols en CA / ES / EN.')}</p>

        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex gap-2">
            {LANGS.map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setActiveConfigLang(l)}
                aria-pressed={activeConfigLang === l}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  activeConfigLang === l ? 'bg-admin-accent text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAutoTranslateConfig}
            disabled={translatingConfig}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100 disabled:opacity-50"
            title={t('admin.board.translate_from', 'Traduir des de {{lang}}', { lang: activeConfigLang.toUpperCase() })}
          >
            <Languages className="w-4 h-4" />
            {translatingConfig
              ? t('admin.board.translating', 'Traduint...')
              : t('admin.board.translate_from', 'Traduir des de {{lang}}', { lang: activeConfigLang.toUpperCase() })}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1 block" htmlFor="board-title">
              {t('admin.board.field_title', 'Títol')}
            </label>
            <input
              id="board-title"
              value={config.translations?.[activeConfigLang]?.title || ''}
              onChange={e => setConfigField(activeConfigLang, 'title', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900/10 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1 block" htmlFor="board-subtitle">
              {t('admin.board.field_subtitle', 'Subtítol')}
            </label>
            <input
              id="board-subtitle"
              value={config.translations?.[activeConfigLang]?.subtitle || ''}
              onChange={e => setConfigField(activeConfigLang, 'subtitle', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900/10 outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-neutral-600 mb-1 block" htmlFor="board-mission">
              {t('admin.board.field_mission', "Què és l'AFA? (missió)")}
            </label>
            <textarea
              id="board-mission"
              value={config.translations?.[activeConfigLang]?.mission || ''}
              onChange={e => setConfigField(activeConfigLang, 'mission', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900/10 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1 block" htmlFor="board-composition-title">
              {t('admin.board.field_composition_title', 'Títol de la secció Junta')}
            </label>
            <input
              id="board-composition-title"
              value={config.translations?.[activeConfigLang]?.composition_title || ''}
              onChange={e => setConfigField(activeConfigLang, 'composition_title', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900/10 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1 block" htmlFor="board-composition-intro">
              {t('admin.board.field_composition_intro', 'Intro de la Junta')}
            </label>
            <input
              id="board-composition-intro"
              value={config.translations?.[activeConfigLang]?.composition_intro || ''}
              onChange={e => setConfigField(activeConfigLang, 'composition_intro', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900/10 outline-none"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end items-center gap-3">
          {configDirty && <span className="text-[13px] text-amber-700">{t('admin.unsaved.banner', 'Tens canvis sense desar.')}</span>}
          <button type="button" onClick={handleSaveConfig} disabled={savingConfig} className={PRIMARY_BTN}>
            <Save className="w-4 h-4" />
            {savingConfig ? t('common.saving') : t('admin.board.save_texts', 'Desar textos')}
          </button>
        </div>
      </section>

      {/* Members list */}
      <section className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-bold text-neutral-900">
            {t('admin.board.members', 'Membres')} ({members.length})
          </h2>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('admin.board.search_placeholder', 'Cerca per nom, càrrec o email...')}
              aria-label={t('admin.board.search_placeholder', 'Cerca per nom, càrrec o email...')}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg bg-white text-[13px] outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
          </div>
        ) : visibleMembers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 mb-4">
              {search ? t('common.no_results', 'Sense resultats') : t('admin.board.empty', 'Encara no hi ha membres.')}
            </p>
            {!search && (
              <button type="button" onClick={startCreate} className="text-neutral-900 font-semibold hover:underline">
                {t('admin.board.add_first', 'Afegir el primer')}
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {visibleMembers.map(m => {
              const idx = members.indexOf(m);
              return (
                <li key={m.id} className="flex items-center gap-4 p-4 hover:bg-neutral-50">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0 || !!search}
                      className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                      title={t('admin.board.move_up', 'Pujar')}
                      aria-label={t('admin.board.move_up', 'Pujar')}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(idx, 1)}
                      disabled={idx === members.length - 1 || !!search}
                      className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                      title={t('admin.board.move_down', 'Baixar')}
                      aria-label={t('admin.board.move_down', 'Baixar')}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-neutral-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-neutral-900 truncate">{m.name}</p>
                      {!m.is_visible && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full">
                          {t('admin.board.hidden', 'Ocult')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500 truncate">{m.role}</p>
                    {m.email && <p className="text-xs text-neutral-400 truncate">{m.email}</p>}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleVisible(m)}
                      className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg"
                      title={m.is_visible ? t('admin.board.hide', 'Ocultar') : t('admin.board.show', 'Mostrar')}
                      aria-label={m.is_visible ? t('admin.board.hide', 'Ocultar') : t('admin.board.show', 'Mostrar')}
                    >
                      {m.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(m)}
                      className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                      title={t('common.edit')}
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal
        open={showForm}
        onClose={closeForm}
        title={form.id ? t('admin.board.edit_member', 'Editar membre') : t('admin.board.new_member', 'Nou membre')}
        size="lg"
        closeOnBackdrop={false}
        footer={
          <>
            <button type="button" onClick={closeForm} className={SECONDARY_BTN}>
              {t('common.cancel')}
            </button>
            <button type="button" onClick={() => handleSave()} disabled={saving} className={PRIMARY_BTN}>
              <Save className="w-4 h-4" />
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1 block" htmlFor="member-name">
                {t('admin.board.field_name', 'Nom complet')} *
              </label>
              <input
                id="member-name"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900/10 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1 block" htmlFor="member-role">
                {t('admin.board.field_role', 'Càrrec')} *
              </label>
              <select
                id="member-role"
                value={form.role_key}
                onChange={e => setForm({ ...form, role_key: e.target.value as BoardRoleKey })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-neutral-900/10 outline-none"
              >
                {ROLE_KEYS.map(r => (
                  <option key={r.value} value={r.value}>{t(r.labelKey, r.fallback)}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-neutral-600 mb-1 block" htmlFor="member-email">
                {t('admin.board.field_email', 'Email (opcional)')}
              </label>
              <input
                id="member-email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900/10 outline-none"
              />
            </div>
          </div>

          {/* Photo */}
          <div>
            <span className="text-xs font-semibold text-neutral-600 mb-1 block">{t('admin.board.field_photo', 'Foto')}</span>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-neutral-100 flex items-center justify-center flex-shrink-0">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-neutral-300" />
                )}
              </div>
              <label className="flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 text-sm font-semibold text-neutral-700">
                <Upload className="w-4 h-4" />
                {uploading ? t('common.uploading', 'Pujant...') : t('admin.board.upload_photo', 'Pujar foto')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
              </label>
              {form.photo_url && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, photo_url: '' })}
                  className="text-sm text-red-600 hover:underline"
                >
                  {t('admin.board.remove_photo', 'Treure')}
                </button>
              )}
            </div>
          </div>

          {/* Translations */}
          <div className="border-t border-neutral-100 pt-4">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <p className="text-xs font-semibold text-neutral-600">
                {t('admin.board.translations', 'Traduccions (càrrec descriptiu + bio)')}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoTranslateMember}
                  disabled={translatingMember}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100 disabled:opacity-50"
                >
                  <Languages className="w-3.5 h-3.5" />
                  {translatingMember
                    ? '...'
                    : t('admin.board.translate_from', 'Traduir des de {{lang}}', { lang: activeLang.toUpperCase() })}
                </button>
                <div className="flex gap-1">
                  {LANGS.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setActiveLang(l)}
                      aria-pressed={activeLang === l}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase ${
                        activeLang === l ? 'bg-admin-accent text-white' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-500 mb-1 block" htmlFor="member-role-text">
                  {t('admin.board.field_role_public', 'Càrrec (text públic)')}
                </label>
                <input
                  id="member-role-text"
                  value={form.translations[activeLang].role}
                  onChange={e => setForm({
                    ...form,
                    translations: {
                      ...form.translations,
                      [activeLang]: { ...form.translations[activeLang], role: e.target.value },
                    },
                  })}
                  placeholder={roleLabel(form.role_key)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900/10 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block" htmlFor="member-bio">
                  {t('admin.board.field_bio', 'Bio breu (opcional)')}
                </label>
                <textarea
                  id="member-bio"
                  value={form.translations[activeLang].bio}
                  rows={3}
                  onChange={e => setForm({
                    ...form,
                    translations: {
                      ...form.translations,
                      [activeLang]: { ...form.translations[activeLang], bio: e.target.value },
                    },
                  })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900/10 outline-none"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_visible}
              onChange={e => setForm({ ...form, is_visible: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <span className="text-sm text-neutral-700">{t('admin.board.field_visible', 'Visible a la web pública')}</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
