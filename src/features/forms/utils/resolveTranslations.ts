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

/** Returns a per-field translated label/placeholder/options object. Falls back to es. */
export function resolveField(template: FormTemplate, field: FormField, lang: string | undefined): FormField {
  const l = langOrEs(lang);
  if (l === SOURCE_LANG) return field;

  const fx: FieldTranslation | undefined = template.translations?.[l]?.fields?.[field.id];
  if (!fx) return field;

  return {
    ...field,
    label: fx.label?.trim() ? fx.label : field.label,
    placeholder: fx.placeholder?.trim() ? fx.placeholder : field.placeholder,
    options:
      fx.options && fx.options.length === (field.options?.length ?? 0) && fx.options.some((o) => o.trim() !== '')
        ? fx.options
        : field.options,
  };
}
