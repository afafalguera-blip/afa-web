import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Wand2, Loader2, Download } from 'lucide-react';
import type { InscriptionContentBlock, InscriptionFormConfig } from '../../../services/ConfigService';
import { TranslationService } from '../../../services/TranslationService';

type Lang = 'ca' | 'es' | 'en';

interface FieldDef {
  key: keyof InscriptionContentBlock;
  i18nKey: string;        // fallback shown as placeholder hint
  multiline?: boolean;
}

interface Group { title: string; fields: FieldDef[]; }

const GROUPS: Group[] = [
  { title: 'Capçalera', fields: [
    { key: 'title_prefix', i18nKey: 'inscription.title_prefix' },
    { key: 'title_highlight', i18nKey: 'inscription.title_highlight' },
    { key: 'subtitle_prefix', i18nKey: 'inscription.subtitle_prefix' },
    { key: 'subtitle_highlight', i18nKey: 'inscription.subtitle_highlight' },
    { key: 'subtitle_suffix', i18nKey: 'inscription.subtitle_suffix', multiline: true },
  ]},
  { title: 'Caixes informatives', fields: [
    { key: 'info_box_title', i18nKey: 'inscription.info_box.title' },
    { key: 'info_box_text', i18nKey: 'inscription.info_box.text', multiline: true },
  ]},
  { title: 'Preus i pagament', fields: [
    { key: 'pricing_title', i18nKey: 'inscription.pricing.title' },
    { key: 'english_warning_title', i18nKey: 'inscription.pricing.english_warning_title' },
    { key: 'english_warning_body', i18nKey: 'inscription.pricing.english_warning_body', multiline: true },
    { key: 'payment_method_title', i18nKey: 'inscription.pricing.payment_method_title' },
    { key: 'payment_method_body', i18nKey: 'inscription.pricing.payment_method_body', multiline: true },
    { key: 'iban_hint', i18nKey: 'inscription.pricing.iban_hint' },
  ]},
  { title: 'Títols de secció', fields: [
    { key: 'student_section', i18nKey: 'inscription.form.student_section' },
    { key: 'parent_section', i18nKey: 'inscription.form.parent_section' },
    { key: 'additional_section', i18nKey: 'inscription.form.additional_section' },
  ]},
  { title: 'Condicions i enviament', fields: [
    { key: 'terms_accept', i18nKey: 'inscription.form.terms_accept' },
    { key: 'terms_link', i18nKey: 'inscription.form.terms_link' },
    { key: 'terms_url', i18nKey: '' },
    { key: 'submit_btn', i18nKey: 'inscription.form.submit_btn' },
    { key: 'privacy_note', i18nKey: 'inscription.form.privacy_note', multiline: true },
  ]},
  { title: 'Missatge d\'èxit', fields: [
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
  const { t } = useTranslation();
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const setField = (key: keyof InscriptionContentBlock, value: string) => {
    setContent({ ...content, [activeLang]: { ...content[activeLang], [key]: value } });
  };

  // Fill the empty fields of the active language with the current texts shown
  // on the public form (the i18n defaults), so they become editable instead of
  // staying as a grey placeholder. Already-edited fields are left untouched.
  const loadCurrentTexts = () => {
    const block: InscriptionContentBlock = { ...content[activeLang] };
    for (const g of GROUPS) for (const f of g.fields) {
      if (!f.i18nKey) continue;
      const cur = block[f.key];
      if (!cur || !cur.trim()) block[f.key] = t(f.i18nKey);
    }
    setContent({ ...content, [activeLang]: block });
  };

  const autoTranslate = async () => {
    setTranslating(true);
    setTranslateError(null);
    try {
      // Source = Spanish. Pack non-empty ES fields.
      const es = content.es;
      const bag: Record<string, string> = {};
      for (const g of GROUPS) for (const f of g.fields) {
        const v = es[f.key];
        if (v && v.trim()) bag[f.key as string] = v;
      }
      if (Object.keys(bag).length === 0) { setTranslateError('Omple primer els textos en castellà (ES).'); return; }
      const res = await TranslationService.translateBulk(bag, 'es', ['ca', 'en']);
      const next = { ...content };
      (['ca', 'en'] as const).forEach(lang => {
        next[lang] = { ...next[lang] };
        for (const k of Object.keys(res[lang] || {})) {
          (next[lang] as Record<string, string>)[k] = res[lang][k];
        }
      });
      setContent(next);
    } catch (e) {
      console.error(e);
      setTranslateError('No s\'ha pogut traduir automàticament. Edita manualment.');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-8">
      <div className="flex items-start justify-between gap-4 border-b border-neutral-50 dark:border-neutral-700 pb-4">
        <div>
          <h3 className="text-xl font-bold text-neutral-800 dark:text-white flex items-center gap-2">
            <FileText size={20} className="text-primary" /> Textos del formulari
          </h3>
          <p className="text-xs text-neutral-500 mt-1">Buit = es mostra el text per defecte (en gris). Fes «Carregar textos actuals» per editar-los.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
            {(['ca', 'es', 'en'] as const).map(l => (
              <button key={l} type="button" onClick={() => setActiveLang(l)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeLang === l ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" onClick={loadCurrentTexts}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            <Download size={14} /> Carregar textos actuals
          </button>
          <button type="button" onClick={autoTranslate} disabled={translating}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 disabled:opacity-50">
            {translating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Traduir (ES→CA/EN)
          </button>
        </div>
      </div>

      {translateError && <p className="text-xs text-red-500 -mt-4">{translateError}</p>}

      {GROUPS.map(group => (
        <div key={group.title} className="space-y-4">
          <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">{group.title}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.fields.map(f => {
              const hint = f.i18nKey ? t(f.i18nKey) : '';
              const value = content[activeLang][f.key] || '';
              return (
                <div key={f.key} className={`space-y-1 ${f.multiline ? 'md:col-span-2' : ''}`}>
                  <label className="text-[11px] font-bold text-neutral-500">{f.key}</label>
                  {f.multiline ? (
                    <textarea value={value} onChange={e => setField(f.key, e.target.value)} placeholder={hint}
                      className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-sm min-h-[80px]" />
                  ) : (
                    <input type="text" value={value} onChange={e => setField(f.key, e.target.value)} placeholder={hint}
                      className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-sm" />
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
