import type {
  FormTemplate,
  FormField,
  SupportedLang,
  FormTranslation,
  FieldTranslation,
} from '../types/formTypes';

const SOURCE_LANG: SupportedLang = 'es';

const langOrEs = (lang: string | undefined): SupportedLang => {
  if (lang === 'ca' || lang === 'en' || lang === 'es') return lang;
  return SOURCE_LANG;
};

/** Returns the {title, description} for the given lang, falling back to es. */
export function resolveTemplateText(template: FormTemplate, lang: string | undefined) {
  const l = langOrEs(lang);
  if (l === SOURCE_LANG) {
    return { title: template.title, description: template.description };
  }
  const tx: FormTranslation | undefined = template.translations?.[l];
  return {
    title: tx?.title?.trim() ? tx.title : template.title,
    description: tx?.description?.trim() ? tx.description : template.description,
  };
}

const isFilled = (s: unknown): s is string => typeof s === 'string' && s.trim() !== '';

/** Returns a per-field translated label/placeholder/options object. Falls back to es. */
export function resolveField(template: FormTemplate, field: FormField, lang: string | undefined): FormField {
  const l = langOrEs(lang);
  if (l === SOURCE_LANG) return field;

  const fx: FieldTranslation | undefined = template.translations?.[l]?.fields?.[field.id];
  if (!fx) return field;

  let options = field.options;
  if (
    Array.isArray(fx.options) &&
    fx.options.length === (field.options?.length ?? 0) &&
    fx.options.some(isFilled)
  ) {
    options = field.options?.map((src, i) => (isFilled(fx.options?.[i]) ? (fx.options![i] as string) : src));
  }

  return {
    ...field,
    label: isFilled(fx.label) ? fx.label : field.label,
    placeholder: isFilled(fx.placeholder) ? fx.placeholder : field.placeholder,
    options,
  };
}
