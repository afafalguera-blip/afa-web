import { useEffect, useState } from 'react';
import {
  Plus,
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
  X,
  CheckCircle2,
  AlertCircle,
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

const ROLE_KEYS: { value: BoardRoleKey; label: string }[] = [
  { value: 'president', label: 'Presidente/a' },
  { value: 'vicepresident', label: 'Vicepresidente/a' },
  { value: 'treasurer', label: 'Tesorero/a' },
  { value: 'secretary', label: 'Secretario/a' },
  { value: 'vocal', label: 'Vocal' },
];

const LANGS = ['ca', 'es', 'en'] as const;
type Lang = typeof LANGS[number];

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
  const [activeLang, setActiveLang] = useState<Lang>('es');
  const [activeConfigLang, setActiveConfigLang] = useState<Lang>('es');
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const showToast = (kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [list, cfg] = await Promise.all([
        BoardService.listAll(),
        BoardService.getSectionConfig(),
      ]);
      setMembers(list);
      setConfig(cfg ?? { translations: {} });
    } catch (e) {
      console.error(e);
      showToast('err', 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setForm(emptyForm());
    setActiveLang('es');
    setShowForm(true);
  };

  const startEdit = (m: BoardMember) => {
    const tr = m.translations || {};
    setForm({
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
    setActiveLang('es');
    setShowForm(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await BoardService.uploadPhoto(file);
      setForm(f => ({ ...f, photo_url: url }));
    } catch (e) {
      console.error(e);
      showToast('err', 'Error subiendo imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('err', 'El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const fallbackRole =
        form.translations.es.role || form.translations.ca.role || form.translations.en.role ||
        ROLE_KEYS.find(r => r.value === form.role_key)?.label || form.role_key;
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
        showToast('ok', 'Miembro actualizado');
      } else {
        const maxOrder = members.reduce((max, m) => Math.max(max, m.display_order), -1);
        await BoardService.create({ ...payload, display_order: maxOrder + 1 });
        showToast('ok', 'Miembro creado');
      }
      setShowForm(false);
      await load();
    } catch (e) {
      console.error(e);
      showToast('err', 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: BoardMember) => {
    if (!confirm(`¿Eliminar a ${m.name}?`)) return;
    try {
      await BoardService.remove(m.id);
      showToast('ok', 'Eliminado');
      await load();
    } catch (e) {
      console.error(e);
      showToast('err', 'Error eliminando');
    }
  };

  const handleToggleVisible = async (m: BoardMember) => {
    try {
      await BoardService.update(m.id, { is_visible: !m.is_visible });
      await load();
    } catch (e) {
      console.error(e);
      showToast('err', 'Error actualizando');
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
      showToast('err', 'Error reordenando');
      await load();
    }
  };

  const handleAutoTranslateConfig = async () => {
    const source = config.translations?.[activeConfigLang];
    if (!source) {
      showToast('err', 'Rellena primero los textos en el idioma activo');
      return;
    }
    const fields: Record<string, string> = {
      title: source.title || '',
      subtitle: source.subtitle || '',
      mission: source.mission || '',
      composition_title: source.composition_title || '',
      composition_intro: source.composition_intro || '',
    };
    const hasAny = Object.values(fields).some(v => v.trim());
    if (!hasAny) {
      showToast('err', 'No hay contenido en el idioma activo');
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
      showToast('ok', 'Traducciones generadas — revisa y guarda');
    } catch (e) {
      console.error(e);
      showToast('err', 'Error traduciendo (revisa VITE_TRANSLATION_PROXY_URL)');
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
      showToast('err', 'No hay contenido en el idioma activo');
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
      showToast('ok', 'Traducciones generadas');
    } catch (e) {
      console.error(e);
      showToast('err', 'Error traduciendo');
    } finally {
      setTranslatingMember(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await BoardService.updateSectionConfig(config);
      showToast('ok', 'Textos actualizados');
    } catch (e) {
      console.error(e);
      showToast('err', 'Error guardando textos');
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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Sobre AFA / Junta Directiva
          </h1>
          <p className="text-neutral-500 mt-1">Configura los textos públicos y los miembros visibles en /sobre-afa.</p>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo miembro
        </button>
      </header>

      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${
          toast.kind === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toast.kind === 'ok' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* Section copy */}
      <section className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900 mb-1">Textos de la página</h2>
        <p className="text-sm text-neutral-500 mb-4">Hero y subtítulos en CA / ES / EN.</p>

        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex gap-2">
            {LANGS.map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setActiveConfigLang(l)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  activeConfigLang === l ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
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
            title={`Traducir desde ${activeConfigLang.toUpperCase()} a los otros idiomas`}
          >
            <Languages className="w-4 h-4" />
            {translatingConfig ? 'Traduciendo...' : `Auto-traducir desde ${activeConfigLang.toUpperCase()}`}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1 block">Título</label>
            <input
              value={config.translations?.[activeConfigLang]?.title || ''}
              onChange={e => setConfigField(activeConfigLang, 'title', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1 block">Subtítulo</label>
            <input
              value={config.translations?.[activeConfigLang]?.subtitle || ''}
              onChange={e => setConfigField(activeConfigLang, 'subtitle', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-neutral-600 mb-1 block">¿Qué es el AFA? (misión)</label>
            <textarea
              value={config.translations?.[activeConfigLang]?.mission || ''}
              onChange={e => setConfigField(activeConfigLang, 'mission', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1 block">Título de la sección Junta</label>
            <input
              value={config.translations?.[activeConfigLang]?.composition_title || ''}
              onChange={e => setConfigField(activeConfigLang, 'composition_title', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-600 mb-1 block">Intro de la Junta</label>
            <input
              value={config.translations?.[activeConfigLang]?.composition_intro || ''}
              onChange={e => setConfigField(activeConfigLang, 'composition_intro', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {savingConfig ? 'Guardando...' : 'Guardar textos'}
          </button>
        </div>
      </section>

      {/* Members list */}
      <section className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-bold text-neutral-900">Miembros ({members.length})</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 mb-4">No hay miembros aún.</p>
            <button onClick={startCreate} className="text-blue-600 font-semibold hover:underline">
              Añadir el primero
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {members.map((m, idx) => (
              <li key={m.id} className="flex items-center gap-4 p-4 hover:bg-neutral-50">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                    title="Subir"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === members.length - 1}
                    className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                    title="Bajar"
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
                        Oculto
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 truncate">{m.role}</p>
                  {m.email && <p className="text-xs text-neutral-400 truncate">{m.email}</p>}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleVisible(m)}
                    className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg"
                    title={m.is_visible ? 'Ocultar' : 'Mostrar'}
                  >
                    {m.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => startEdit(m)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl my-8 max-h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100 flex-shrink-0">
              <h3 className="text-lg font-bold text-neutral-900">
                {form.id ? 'Editar miembro' : 'Nuevo miembro'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-600 mb-1 block">Nombre completo *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600 mb-1 block">Cargo *</label>
                  <select
                    value={form.role_key}
                    onChange={e => setForm({ ...form, role_key: e.target.value as BoardRoleKey })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {ROLE_KEYS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-neutral-600 mb-1 block">Email (opcional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Photo */}
              <div>
                <label className="text-xs font-semibold text-neutral-600 mb-1 block">Foto</label>
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
                    {uploading ? 'Subiendo...' : 'Subir foto'}
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
                      className="text-sm text-rose-600 hover:underline"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              {/* Translations */}
              <div className="border-t border-neutral-100 pt-4">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <p className="text-xs font-semibold text-neutral-600">Traducciones (cargo descriptivo + bio)</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoTranslateMember}
                      disabled={translatingMember}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100 disabled:opacity-50"
                      title={`Traducir desde ${activeLang.toUpperCase()}`}
                    >
                      <Languages className="w-3.5 h-3.5" />
                      {translatingMember ? '...' : `Auto-traducir desde ${activeLang.toUpperCase()}`}
                    </button>
                    <div className="flex gap-1">
                      {LANGS.map(l => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setActiveLang(l)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase ${
                            activeLang === l ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-600'
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
                    <label className="text-xs text-neutral-500 mb-1 block">Cargo (texto público)</label>
                    <input
                      value={form.translations[activeLang].role}
                      onChange={e => setForm({
                        ...form,
                        translations: {
                          ...form.translations,
                          [activeLang]: { ...form.translations[activeLang], role: e.target.value },
                        },
                      })}
                      placeholder={ROLE_KEYS.find(r => r.value === form.role_key)?.label}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Bio breve (opcional)</label>
                    <textarea
                      value={form.translations[activeLang].bio}
                      rows={3}
                      onChange={e => setForm({
                        ...form,
                        translations: {
                          ...form.translations,
                          [activeLang]: { ...form.translations[activeLang], bio: e.target.value },
                        },
                      })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_visible}
                  onChange={e => setForm({ ...form, is_visible: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700">Visible en la web pública</span>
              </label>
            </form>

            <div className="flex justify-end gap-2 p-5 border-t border-neutral-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-neutral-200 rounded-lg font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
