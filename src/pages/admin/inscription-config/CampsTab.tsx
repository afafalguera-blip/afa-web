import { useState } from 'react';
import { ListChecks, Plus, Trash2, Wand2, Loader2 } from 'lucide-react';
import type { OptionalFieldConfig, OptionalFieldKey, CustomQuestion, LangText } from '../../../services/ConfigService';
import { TranslationService } from '../../../services/TranslationService';
import { slugify } from '../../../utils/slug';
import { useSettingsT } from '../settings/useSettingsT';
import { useToast } from '../../../components/common/Toast';
import { useConfirm } from '../../../components/common/ConfirmDialog';

type Lang = 'ca' | 'es' | 'en';

const FIELD_NAMES: Record<OptionalFieldKey, { key: string; fallback: string }> = {
  parent_dni: { key: 'admin.inscription_config.fields.parent_dni', fallback: 'DNI/NIE del tutor' },
  parent_phone_2: { key: 'admin.inscription_config.fields.parent_phone_2', fallback: 'Telèfon 2' },
  parent_email_2: { key: 'admin.inscription_config.fields.parent_email_2', fallback: 'Email 2' },
  health_info: { key: 'admin.inscription_config.fields.health_info', fallback: 'Salut / al·lèrgies' },
  image_rights: { key: 'admin.inscription_config.fields.image_rights', fallback: "Drets d'imatge" },
  leave_alone: { key: 'admin.inscription_config.fields.leave_alone', fallback: 'Sortida sol/a' },
};

const emptyLangText = (): LangText => ({ ca: '', es: '', en: '' });

const INPUT_CLASS = 'w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm';

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
  const t = useSettingsT();
  const { toast } = useToast();
  const confirm = useConfirm();
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

  const removeQuestion = async (idx: number) => {
    const question = customQuestions[idx];
    const ok = await confirm({
      title: t('admin.inscription_config.delete_question_title', 'Eliminar la pregunta?'),
      message: t(
        'admin.inscription_config.delete_question_message',
        'Deixarà de mostrar-se al formulari públic. Les respostes ja enviades es conserven.'
      ),
      itemName: question?.label?.[activeLang] || question?.key || undefined,
      confirmLabel: t('common.delete', 'Eliminar'),
      destructive: true,
    });
    if (!ok) return;
    setCustomQuestions(customQuestions.filter((_, i) => i !== idx));
  };

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
      if (!Object.keys(bag).length) {
        toast.info(t('admin.inscription_config.translate_empty', 'Omple primer els textos en castellà (ES).'));
        return;
      }
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
      toast.success(t('admin.inscription_config.translate_ok', 'Traduccions generades'));
    } catch (e) {
      console.error(e);
      toast.error(t('common.error_translation', "No s'ha pogut traduir automàticament."));
    } finally {
      setTranslating(false);
    }
  };

  const langSwitcher = (
    <div className="flex p-1 bg-neutral-100 rounded-lg">
      {(['ca', 'es', 'en'] as const).map(l => (
        <button key={l} type="button" onClick={() => setActiveLang(l)}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeLang === l ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-8">
      <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <ListChecks size={18} className="text-neutral-700" />
            {t('admin.inscription_config.fields_title', 'Camps del formulari')}
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            {t('admin.inscription_config.fields_subtitle', 'Activa/desactiva camps existents i crea preguntes pròpies.')}
          </p>
        </div>
        {langSwitcher}
      </div>

      {/* Existing optional fields */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
          {t('admin.inscription_config.existing_fields', 'Camps existents')}
        </h4>
        {fields.map((f, idx) => (
          <div key={f.key} className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 flex flex-col md:flex-row md:items-center gap-3">
            <div className="md:w-48 shrink-0">
              <p className="text-sm font-bold text-neutral-700">{t(FIELD_NAMES[f.key].key, FIELD_NAMES[f.key].fallback)}</p>
              <p className="text-[10px] text-neutral-400 font-mono">{f.key}</p>
            </div>
            <input
              type="text"
              value={f.label[activeLang] || ''}
              onChange={e => setFieldLabel(idx, e.target.value)}
              aria-label={`${t('admin.inscription_config.label', 'Etiqueta')} ${f.key}`}
              placeholder={`${t('admin.inscription_config.label', 'Etiqueta')} (${activeLang.toUpperCase()}) — ${t('admin.inscription_config.empty_default', 'buit = per defecte')}`}
              className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm"
            />
            <div className="flex items-center gap-4 shrink-0">
              <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 cursor-pointer">
                <input type="checkbox" checked={f.enabled} onChange={e => updateField(idx, { enabled: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400" />
                {t('admin.inscription_config.active', 'Actiu')}
              </label>
              <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 cursor-pointer">
                <input type="checkbox" checked={f.required} onChange={e => updateField(idx, { required: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400" />
                {t('admin.inscription_config.required', 'Obligatori')}
              </label>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-neutral-100" />

      {/* Custom questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
              {t('admin.inscription_config.custom_questions', 'Preguntes personalitzades')}
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              {t('admin.inscription_config.key_locked_hint', 'El nom intern (clau) no es pot canviar un cop desat.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={autoTranslateQuestions} disabled={translating}
              className="text-xs font-bold text-neutral-700 hover:text-neutral-900 hover:underline flex items-center gap-1 disabled:opacity-50">
              {translating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              {t('admin.faq.auto_translate', 'Traduir')}
            </button>
            <button type="button" onClick={addQuestion} className="text-xs font-bold text-neutral-700 hover:text-neutral-900 hover:underline flex items-center gap-1">
              <Plus size={14} /> {t('admin.inscription_config.add_question', 'Afegir pregunta')}
            </button>
          </div>
        </div>

        {customQuestions.length === 0 && (
          <p className="text-sm text-neutral-400">
            {t('admin.inscription_config.no_questions', 'Cap pregunta personalitzada.')}
          </p>
        )}

        {customQuestions.map((q, idx) => {
          const locked = lockedKeys.has(q.key) && q.key !== '';
          return (
            <div key={idx} className="p-5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <input type="text" value={q.key} disabled={locked}
                  onChange={e => updateQuestion(idx, { key: slugify(e.target.value) })}
                  onBlur={() => { if (!q.key && q.label.es) updateQuestion(idx, { key: slugify(q.label.es) }); }}
                  aria-label={t('admin.inscription_config.question_key', 'Clau de la pregunta')}
                  placeholder={t('admin.inscription_config.question_key_placeholder', 'clau (ex: talla_samarreta)')}
                  className="font-mono text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white disabled:opacity-60 w-full sm:w-56" />
                <select value={q.type} onChange={e => updateQuestion(idx, { type: e.target.value as CustomQuestion['type'] })}
                  aria-label={t('admin.inscription_config.question_type', 'Tipus de pregunta')}
                  className="text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white">
                  <option value="text">{t('admin.inscription_config.type_text', 'Text curt')}</option>
                  <option value="long_text">{t('admin.inscription_config.type_long_text', 'Text llarg')}</option>
                  <option value="select">{t('admin.inscription_config.type_select', 'Desplegable')}</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 cursor-pointer">
                  <input type="checkbox" checked={q.enabled} onChange={e => updateQuestion(idx, { enabled: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400" />
                  {t('admin.inscription_config.active', 'Actiu')}
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 cursor-pointer">
                  <input type="checkbox" checked={q.required} onChange={e => updateQuestion(idx, { required: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400" />
                  {t('admin.inscription_config.required', 'Obligatori')}
                </label>
                <button type="button" onClick={() => removeQuestion(idx)} aria-label={t('common.delete', 'Eliminar')} className="ml-auto p-1.5 text-neutral-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">
                    {t('admin.inscription_config.label', 'Etiqueta')} ({activeLang.toUpperCase()})
                  </label>
                  <input type="text" value={q.label[activeLang] || ''} onChange={e => setQLang(idx, 'label', e.target.value)}
                    className={INPUT_CLASS} />
                </div>
                {q.type !== 'select' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">
                      {t('admin.inscription_config.placeholder', 'Placeholder')} ({activeLang.toUpperCase()})
                    </label>
                    <input type="text" value={q.placeholder?.[activeLang] || ''} onChange={e => setQLang(idx, 'placeholder', e.target.value)}
                      className={INPUT_CLASS} />
                  </div>
                )}
              </div>

              {q.type === 'select' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">
                      {t('admin.inscription_config.options', 'Opcions')} ({activeLang.toUpperCase()})
                    </span>
                    <button type="button" onClick={() => addOption(idx)} className="text-[11px] font-bold text-neutral-700 hover:text-neutral-900 hover:underline flex items-center gap-1">
                      <Plus size={12} /> {t('admin.inscription_config.option', 'Opció')}
                    </button>
                  </div>
                  {(q.options || []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="text" value={opt[activeLang] || ''} onChange={e => setOption(idx, oi, e.target.value)}
                        aria-label={`${t('admin.inscription_config.option', 'Opció')} ${oi + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm" />
                      <button type="button" onClick={() => removeOption(idx, oi)} aria-label={t('common.delete', 'Eliminar')} className="p-1 text-neutral-400 hover:text-red-500">
                        <Trash2 size={12} />
                      </button>
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
