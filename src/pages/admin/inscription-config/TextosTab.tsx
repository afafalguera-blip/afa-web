import { useState } from 'react';
import { FileText, Wand2, Loader2 } from 'lucide-react';
import type { InscriptionContentBlock, InscriptionFormConfig } from '../../../services/ConfigService';
import { TranslationService } from '../../../services/TranslationService';
import { useSettingsT } from '../settings/useSettingsT';
import { useToast } from '../../../components/common/Toast';

type Lang = 'ca' | 'es' | 'en';

interface FieldDef {
  key: keyof InscriptionContentBlock;
  i18nKey: string;        // fallback shown as placeholder hint
  multiline?: boolean;
}

interface Group {
  titleKey: string;
  titleDefault: string;
  fields: FieldDef[];
}

const GROUPS: Group[] = [
  { titleKey: 'admin.inscription_config.group.header', titleDefault: 'Capçalera', fields: [
    { key: 'title_prefix', i18nKey: 'inscription.title_prefix' },
    { key: 'title_highlight', i18nKey: 'inscription.title_highlight' },
    { key: 'subtitle_prefix', i18nKey: 'inscription.subtitle_prefix' },
    { key: 'subtitle_highlight', i18nKey: 'inscription.subtitle_highlight' },
    { key: 'subtitle_suffix', i18nKey: 'inscription.subtitle_suffix', multiline: true },
  ]},
  { titleKey: 'admin.inscription_config.group.info_boxes', titleDefault: 'Caixes informatives', fields: [
    { key: 'info_box_title', i18nKey: 'inscription.info_box.title' },
    { key: 'info_box_text', i18nKey: 'inscription.info_box.text', multiline: true },
  ]},
  { titleKey: 'admin.inscription_config.group.pricing', titleDefault: 'Preus i pagament', fields: [
    { key: 'pricing_title', i18nKey: 'inscription.pricing.title' },
    { key: 'english_warning_title', i18nKey: 'inscription.pricing.english_warning_title' },
    { key: 'english_warning_body', i18nKey: 'inscription.pricing.english_warning_body', multiline: true },
    { key: 'payment_method_title', i18nKey: 'inscription.pricing.payment_method_title' },
    { key: 'payment_method_body', i18nKey: 'inscription.pricing.payment_method_body', multiline: true },
    { key: 'iban_hint', i18nKey: 'inscription.pricing.iban_hint' },
  ]},
  { titleKey: 'admin.inscription_config.group.sections', titleDefault: 'Títols de secció', fields: [
    { key: 'student_section', i18nKey: 'inscription.form.student_section' },
    { key: 'parent_section', i18nKey: 'inscription.form.parent_section' },
    { key: 'additional_section', i18nKey: 'inscription.form.additional_section' },
  ]},
  { titleKey: 'admin.inscription_config.group.terms', titleDefault: 'Condicions i enviament', fields: [
    { key: 'terms_accept', i18nKey: 'inscription.form.terms_accept' },
    { key: 'terms_link', i18nKey: 'inscription.form.terms_link' },
    { key: 'terms_url', i18nKey: '' },
    { key: 'submit_btn', i18nKey: 'inscription.form.submit_btn' },
    { key: 'privacy_note', i18nKey: 'inscription.form.privacy_note', multiline: true },
  ]},
  { titleKey: 'admin.inscription_config.group.success', titleDefault: "Missatge d'èxit", fields: [
    { key: 'success_title', i18nKey: 'inscription.form.success_title' },
    { key: 'success_message', i18nKey: 'inscription.form.success_message', multiline: true },
  ]},
];

interface TextosTabProps {
  content: InscriptionFormConfig['content'];
  setContent: (c: InscriptionFormConfig['content']) => void;
  activeLang: Lang;
  setActiveLang: (l: Lang) => void;
}

export function TextosTab({ content, setContent, activeLang, setActiveLang }: TextosTabProps) {
  // i18next types t() to literal keys only; field hints resolve keys dynamically.
  const t = useSettingsT();
  const { toast } = useToast();
  const [translating, setTranslating] = useState(false);

  const setField = (key: keyof InscriptionContentBlock, value: string) => {
    setContent({ ...content, [activeLang]: { ...content[activeLang], [key]: value } });
  };

  const autoTranslate = async () => {
    setTranslating(true);
    try {
      // Source = Spanish. Pack non-empty ES fields.
      const es = content.es;
      const bag: Record<string, string> = {};
      for (const g of GROUPS) for (const f of g.fields) {
        const v = es[f.key];
        if (v && v.trim()) bag[f.key as string] = v;
      }
      if (Object.keys(bag).length === 0) {
        toast.info(t('admin.inscription_config.translate_empty', 'Omple primer els textos en castellà (ES).'));
        return;
      }
      const res = await TranslationService.translateBulk(bag, 'es', ['ca', 'en']);
      const next = { ...content };
      (['ca', 'en'] as const).forEach(lang => {
        next[lang] = { ...next[lang] };
        for (const k of Object.keys(res[lang] || {})) {
          (next[lang] as Record<string, string>)[k] = res[lang][k];
        }
      });
      setContent(next);
      toast.success(t('admin.inscription_config.translate_ok', 'Traduccions generades'));
    } catch (e) {
      console.error(e);
      toast.error(t('common.error_translation', "No s'ha pogut traduir automàticament. Edita manualment."));
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-8">
      <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <FileText size={18} className="text-neutral-700" />
            {t('admin.inscription_config.texts_title', 'Textos del formulari')}
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            {t('admin.inscription_config.texts_subtitle', "Es mostren els textos actuals. Edita'ls i desa; si esborres un camp, torna al text per defecte.")}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex p-1 bg-neutral-100 rounded-lg">
            {(['ca', 'es', 'en'] as const).map(l => (
              <button key={l} type="button" onClick={() => setActiveLang(l)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeLang === l ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" onClick={autoTranslate} disabled={translating}
            className="text-xs font-bold text-neutral-700 hover:text-neutral-900 hover:underline flex items-center gap-1 disabled:opacity-50">
            {translating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {t('admin.inscription_config.translate_es', 'Traduir (ES→CA/EN)')}
          </button>
        </div>
      </div>

      {GROUPS.map(group => (
        <div key={group.titleKey} className="space-y-4">
          <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
            {t(group.titleKey, group.titleDefault)}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.fields.map(f => {
              const hint = f.i18nKey ? t(f.i18nKey) : '';
              // Show the current text by default: stored override, else the
              // live i18n text. Stored value stays empty until edited, so the
              // "empty = default" fallback on the public form is preserved.
              const value = content[activeLang][f.key] || hint;
              const fieldId = `inscription-text-${f.key}`;
              return (
                <div key={f.key} className={`space-y-1 ${f.multiline ? 'md:col-span-2' : ''}`}>
                  <label htmlFor={fieldId} className="text-[11px] font-bold text-neutral-500">{f.key}</label>
                  {f.multiline ? (
                    <textarea id={fieldId} value={value} onChange={e => setField(f.key, e.target.value)} placeholder={hint}
                      className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm min-h-[80px]" />
                  ) : (
                    <input id={fieldId} type="text" value={value} onChange={e => setField(f.key, e.target.value)} placeholder={hint}
                      className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
