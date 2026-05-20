import { useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Languages, Wand2, Loader2, Info } from 'lucide-react';
import type { SupportedLang, FormField, FormTranslation } from '../types/formTypes';
import { TranslationService } from '../../../services/TranslationService';

const TARGET_LANGS: Array<Exclude<SupportedLang, 'es'>> = ['ca', 'en'];
const LANG_LABEL: Record<SupportedLang, string> = { es: 'Español', ca: 'Català', en: 'English' };

/** Strips HTML tags so we get plain text length for the "auto-translate enabled" check. */
const isNotEmpty = (s: string | undefined | null): boolean => !!s && s.trim().length > 0;

export default function TranslationsPanel() {
  const { t } = useTranslation();
  const { control, getValues, setValue } = useFormContext();
  const [activeLang, setActiveLang] = useState<Exclude<SupportedLang, 'es'>>('ca');
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translateOk, setTranslateOk] = useState(false);

  const sourceTitle = useWatch({ control, name: 'title' }) as string;
  const sourceDescription = useWatch({ control, name: 'description' }) as string;
  const fields = useWatch({ control, name: 'fields_schema' }) as FormField[];

  const canAutoTranslate = isNotEmpty(sourceTitle);

  const runAutoTranslate = async () => {
    if (!canAutoTranslate) {
      setTranslateError(t('forms.builder.translate_fill_source_first'));
      return;
    }
    setTranslating(true);
    setTranslateError(null);
    setTranslateOk(false);
    try {
      const bag: Record<string, string> = {
        title: sourceTitle || '',
      };
      if (isNotEmpty(sourceDescription)) bag.description = sourceDescription;
      (fields || []).forEach((f) => {
        if (isNotEmpty(f.label)) bag[`field__${f.id}__label`] = f.label;
        if (isNotEmpty(f.placeholder)) bag[`field__${f.id}__placeholder`] = f.placeholder!;
        (f.options || []).forEach((opt, i) => {
          if (isNotEmpty(opt)) bag[`field__${f.id}__option__${i}`] = opt;
        });
      });

      const result = await TranslationService.translateBulk(bag, 'es', TARGET_LANGS as string[]);

      for (const lang of TARGET_LANGS) {
        const txMap = result[lang] || {};
        const tx: FormTranslation = {
          title: txMap.title ?? '',
          description: txMap.description ?? '',
          fields: {},
        };
        (fields || []).forEach((f) => {
          const ft: FormTranslation['fields'] = tx.fields!;
          const lbl = txMap[`field__${f.id}__label`];
          const ph = txMap[`field__${f.id}__placeholder`];
          const fieldEntry: { label?: string; placeholder?: string; options?: string[] } = {};
          if (lbl) fieldEntry.label = lbl;
          if (ph) fieldEntry.placeholder = ph;
          if (f.options && f.options.length > 0) {
            fieldEntry.options = f.options.map((_, i) => txMap[`field__${f.id}__option__${i}`] ?? '');
          }
          if (Object.keys(fieldEntry).length > 0) {
            ft[f.id] = fieldEntry;
          }
        });
        setValue(`translations.${lang}`, tx, { shouldDirty: true });
      }
      setTranslateOk(true);
    } catch (err) {
      console.error('Auto-translate error:', err);
      setTranslateError(t('forms.builder.translate_error'));
    } finally {
      setTranslating(false);
    }
  };

  // Read current translation values for the active lang to use as fallbacks in placeholders.
  const currentTx = (getValues(`translations.${activeLang}`) as FormTranslation) || {};

  return (
    <section className="bg-gradient-to-br from-violet-50 to-blue-50 p-3 sm:p-5 rounded-lg border border-violet-100 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-violet-600" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            {t('forms.builder.lang_tab_es')} / {t('forms.builder.lang_tab_ca')} / {t('forms.builder.lang_tab_en')}
          </h2>
        </div>
        <button
          type="button"
          onClick={runAutoTranslate}
          disabled={translating || !canAutoTranslate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {translating ? t('forms.builder.translating') : t('forms.builder.translate_all')}
        </button>
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-600 bg-white/60 p-2 rounded">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-violet-400" />
        <span>{t('forms.builder.translate_explain')}</span>
      </div>

      {translateError && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">{translateError}</div>
      )}
      {translateOk && !translateError && (
        <div className="p-3 bg-green-50 text-green-700 text-xs rounded border border-green-200">
          {t('forms.builder.translate_done')}
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-violet-200">
        {TARGET_LANGS.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setActiveLang(lang)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeLang === lang
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {LANG_LABEL[lang]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
            {t('forms.builder.title_label')}
          </label>
          <Controller
            control={control}
            name={`translations.${activeLang}.title`}
            render={({ field }) => (
              <input
                type="text"
                value={(field.value as string) || ''}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={sourceTitle || ''}
                className="block w-full rounded-md border-violet-200 shadow-sm focus:border-violet-500 focus:ring-violet-500 py-2 px-3 border text-sm"
              />
            )}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
            {t('forms.builder.description')}
          </label>
          <Controller
            control={control}
            name={`translations.${activeLang}.description`}
            render={({ field }) => (
              <textarea
                value={(field.value as string) || ''}
                onChange={(e) => field.onChange(e.target.value)}
                rows={4}
                placeholder={(sourceDescription || '').replace(/<[^>]+>/g, '')}
                className="block w-full rounded-md border-violet-200 shadow-sm focus:border-violet-500 focus:ring-violet-500 py-2 px-3 border text-sm"
              />
            )}
          />
        </div>

        {(fields || [])
          .filter((f) => f.type !== 'section_header' || isNotEmpty(f.label))
          .map((f) => (
            <div key={f.id} className="bg-white rounded-lg border border-violet-100 p-3 space-y-3">
              <div className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">
                {f.label || '—'}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                  {t('forms.builder.q_label')}
                </label>
                <Controller
                  control={control}
                  name={`translations.${activeLang}.fields.${f.id}.label`}
                  render={({ field }) => (
                    <input
                      type="text"
                      value={(field.value as string) || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={f.label || ''}
                      className="block w-full rounded-md border-gray-200 shadow-sm focus:border-violet-500 focus:ring-violet-500 py-1.5 px-2.5 border text-sm"
                    />
                  )}
                />
              </div>

              {isNotEmpty(f.placeholder) && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                    {t('forms.builder.q_placeholder_label')}
                  </label>
                  <Controller
                    control={control}
                    name={`translations.${activeLang}.fields.${f.id}.placeholder`}
                    render={({ field }) => (
                      <input
                        type="text"
                        value={(field.value as string) || ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder={f.placeholder || ''}
                        className="block w-full rounded-md border-gray-200 shadow-sm focus:border-violet-500 focus:ring-violet-500 py-1.5 px-2.5 border text-sm"
                      />
                    )}
                  />
                </div>
              )}

              {(f.options || []).length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                    {t('forms.builder.q_options')}
                  </label>
                  <div className="space-y-1.5">
                    {(f.options || []).map((opt, i) => (
                      <Controller
                        key={i}
                        control={control}
                        name={`translations.${activeLang}.fields.${f.id}.options.${i}`}
                        render={({ field }) => (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-32 truncate flex-shrink-0" title={opt}>
                              {opt}
                            </span>
                            <input
                              type="text"
                              value={(field.value as string) || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder={opt}
                              className="flex-1 rounded-md border-gray-200 shadow-sm focus:border-violet-500 focus:ring-violet-500 py-1 px-2 border text-xs"
                            />
                          </div>
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

        {(!fields || fields.length === 0) && (
          <div className="text-center py-6 text-xs text-gray-400">
            {t('forms.builder.no_questions')}
          </div>
        )}
      </div>

      <div className="text-[10px] text-gray-400">
        {currentTx ? null : null /* using currentTx to keep TS happy if unused */}
      </div>
    </section>
  );
}
