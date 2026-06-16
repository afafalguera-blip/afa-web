import { useState } from 'react';
import { ListChecks, Plus, Trash2, Wand2, Loader2 } from 'lucide-react';
import type { OptionalFieldConfig, OptionalFieldKey, CustomQuestion, LangText } from '../../../services/ConfigService';
import { TranslationService } from '../../../services/TranslationService';
import { slugify } from '../../../utils/slug';

type Lang = 'ca' | 'es' | 'en';

const FIELD_NAMES: Record<OptionalFieldKey, string> = {
  parent_dni: 'DNI/NIE del tutor',
  parent_phone_2: 'Telèfon 2',
  parent_email_2: 'Email 2',
  health_info: 'Salut / al·lèrgies',
  image_rights: "Drets d'imatge",
  leave_alone: 'Sortida sol/a',
};

const emptyLangText = (): LangText => ({ ca: '', es: '', en: '' });

interface CampsTabProps {
  fields: OptionalFieldConfig[];
  setFields: (f: OptionalFieldConfig[]) => void;
  customQuestions: CustomQuestion[];
  setCustomQuestions: (q: CustomQuestion[]) => void;
  activeLang: Lang;
  setActiveLang: (l: Lang) => void;
  /** keys present at load — their slug is locked to keep historical answers stable */
  lockedKeys: Set<string>;
}

export function CampsTab({ fields, setFields, customQuestions, setCustomQuestions, activeLang, setActiveLang, lockedKeys }: CampsTabProps) {
  const [translating, setTranslating] = useState(false);

  const updateField = (idx: number, patch: Partial<OptionalFieldConfig>) => {
    const next = [...fields];
    next[idx] = { ...next[idx], ...patch };
    setFields(next);
  };
  const setFieldLabel = (idx: number, value: string) => {
    const next = [...fields];
    next[idx] = { ...next[idx], label: { ...next[idx].label, [activeLang]: value } };
    setFields(next);
  };

  const addQuestion = () => {
    setCustomQuestions([...customQuestions, {
      key: '', type: 'text', label: emptyLangText(), placeholder: emptyLangText(),
      required: false, enabled: true, options: [],
    }]);
  };
  const updateQuestion = (idx: number, patch: Partial<CustomQuestion>) => {
    const next = [...customQuestions];
    next[idx] = { ...next[idx], ...patch };
    setCustomQuestions(next);
  };
  const removeQuestion = (idx: number) => setCustomQuestions(customQuestions.filter((_, i) => i !== idx));
  const setQLang = (idx: number, prop: 'label' | 'placeholder', value: string) => {
    const next = [...customQuestions];
    const base = next[idx][prop] || emptyLangText();
    next[idx] = { ...next[idx], [prop]: { ...base, [activeLang]: value } };
    setCustomQuestions(next);
  };
  const setOption = (qIdx: number, optIdx: number, value: string) => {
    const next = [...customQuestions];
    const opts = [...(next[qIdx].options || [])];
    opts[optIdx] = { ...(opts[optIdx] || emptyLangText()), [activeLang]: value };
    next[qIdx] = { ...next[qIdx], options: opts };
    setCustomQuestions(next);
  };
  const addOption = (qIdx: number) => {
    const next = [...customQuestions];
    next[qIdx] = { ...next[qIdx], options: [...(next[qIdx].options || []), emptyLangText()] };
    setCustomQuestions(next);
  };
  const removeOption = (qIdx: number, optIdx: number) => {
    const next = [...customQuestions];
    next[qIdx] = { ...next[qIdx], options: (next[qIdx].options || []).filter((_, i) => i !== optIdx) };
    setCustomQuestions(next);
  };

  const autoTranslateQuestions = async () => {
    setTranslating(true);
    try {
      const bag: Record<string, string> = {};
      customQuestions.forEach((q, i) => {
        if (q.label.es?.trim()) bag[`q${i}_label`] = q.label.es;
        if (q.placeholder?.es?.trim()) bag[`q${i}_ph`] = q.placeholder.es;
        (q.options || []).forEach((o, j) => { if (o.es?.trim()) bag[`q${i}_o${j}`] = o.es; });
      });
      if (!Object.keys(bag).length) { setTranslating(false); return; }
      const res = await TranslationService.translateBulk(bag, 'es', ['ca', 'en']);
      const next = customQuestions.map(q => ({ ...q, label: { ...q.label }, placeholder: { ...(q.placeholder || emptyLangText()) }, options: (q.options || []).map(o => ({ ...o })) }));
      (['ca', 'en'] as const).forEach(lang => {
        next.forEach((q, i) => {
          if (res[lang][`q${i}_label`]) q.label[lang] = res[lang][`q${i}_label`];
          if (res[lang][`q${i}_ph`] && q.placeholder) q.placeholder[lang] = res[lang][`q${i}_ph`];
          (q.options || []).forEach((o, j) => { if (res[lang][`q${i}_o${j}`]) o[lang] = res[lang][`q${i}_o${j}`]; });
        });
      });
      setCustomQuestions(next);
    } catch (e) { console.error(e); }
    finally { setTranslating(false); }
  };

  const langSwitcher = (
    <div className="flex p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
      {(['ca', 'es', 'en'] as const).map(l => (
        <button key={l} type="button" onClick={() => setActiveLang(l)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeLang === l ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-8">
      <div className="flex items-start justify-between gap-4 border-b border-neutral-50 dark:border-neutral-700 pb-4">
        <div>
          <h3 className="text-xl font-bold text-neutral-800 dark:text-white flex items-center gap-2">
            <ListChecks size={20} className="text-primary" /> Camps del formulari
          </h3>
          <p className="text-xs text-neutral-500 mt-1">Activa/desactiva camps existents i crea preguntes pròpies.</p>
        </div>
        {langSwitcher}
      </div>

      {/* Existing optional fields */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">Camps existents</h4>
        {fields.map((f, idx) => (
          <div key={f.key} className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-700 flex flex-col md:flex-row md:items-center gap-3">
            <div className="md:w-48 shrink-0">
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{FIELD_NAMES[f.key]}</p>
              <p className="text-[10px] text-neutral-400 font-mono">{f.key}</p>
            </div>
            <input type="text" value={f.label[activeLang] || ''} onChange={e => setFieldLabel(idx, e.target.value)}
              placeholder={`Etiqueta (${activeLang.toUpperCase()}) — buit = per defecte`}
              className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm" />
            <div className="flex items-center gap-4 shrink-0">
              <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer">
                <input type="checkbox" checked={f.enabled} onChange={e => updateField(idx, { enabled: e.target.checked })} className="h-4 w-4 text-primary" /> Actiu
              </label>
              <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer">
                <input type="checkbox" checked={f.required} onChange={e => updateField(idx, { required: e.target.checked })} className="h-4 w-4 text-primary" /> Obligatori
              </label>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-neutral-100 dark:border-neutral-700" />

      {/* Custom questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">Preguntes personalitzades</h4>
            <p className="text-xs text-neutral-400 mt-0.5">El nom intern (clau) no es pot canviar un cop desat.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={autoTranslateQuestions} disabled={translating}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 disabled:opacity-50">
              {translating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Traduir
            </button>
            <button type="button" onClick={addQuestion} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <Plus size={14} /> Afegir pregunta
            </button>
          </div>
        </div>

        {customQuestions.length === 0 && <p className="text-sm text-neutral-400">Cap pregunta personalitzada.</p>}

        {customQuestions.map((q, idx) => {
          const locked = lockedKeys.has(q.key) && q.key !== '';
          return (
            <div key={idx} className="p-5 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-700 space-y-3">
              <div className="flex items-center gap-3">
                <input type="text" value={q.key} disabled={locked}
                  onChange={e => updateQuestion(idx, { key: slugify(e.target.value) })}
                  onBlur={() => { if (!q.key && q.label.es) updateQuestion(idx, { key: slugify(q.label.es) }); }}
                  placeholder="clau (ex: talla_samarreta)"
                  className="font-mono text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 disabled:opacity-60 w-56" />
                <select value={q.type} onChange={e => updateQuestion(idx, { type: e.target.value as CustomQuestion['type'] })}
                  className="text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800">
                  <option value="text">Text curt</option>
                  <option value="long_text">Text llarg</option>
                  <option value="select">Desplegable</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer">
                  <input type="checkbox" checked={q.enabled} onChange={e => updateQuestion(idx, { enabled: e.target.checked })} className="h-4 w-4 text-primary" /> Actiu
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer">
                  <input type="checkbox" checked={q.required} onChange={e => updateQuestion(idx, { required: e.target.checked })} className="h-4 w-4 text-primary" /> Obligatori
                </label>
                <button type="button" onClick={() => removeQuestion(idx)} className="ml-auto p-1.5 text-neutral-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">Etiqueta ({activeLang.toUpperCase()})</label>
                  <input type="text" value={q.label[activeLang] || ''} onChange={e => setQLang(idx, 'label', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm" />
                </div>
                {q.type !== 'select' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Placeholder ({activeLang.toUpperCase()})</label>
                    <input type="text" value={q.placeholder?.[activeLang] || ''} onChange={e => setQLang(idx, 'placeholder', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm" />
                  </div>
                )}
              </div>

              {q.type === 'select' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Opcions ({activeLang.toUpperCase()})</label>
                    <button type="button" onClick={() => addOption(idx)} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"><Plus size={12} /> Opció</button>
                  </div>
                  {(q.options || []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="text" value={opt[activeLang] || ''} onChange={e => setOption(idx, oi, e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm" />
                      <button type="button" onClick={() => removeOption(idx, oi)} className="p-1 text-neutral-400 hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
