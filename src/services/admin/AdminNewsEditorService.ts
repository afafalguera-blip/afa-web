import { supabase } from '../../lib/supabase';
import { sanitizeRichTextHtml } from '../../utils/htmlSanitizer';
import { fromDateTimeLocalInputValue, toDateTimeLocalInputValue } from '../../utils/dateTime';

type Lang = 'ca' | 'es' | 'en';

const AVAILABLE_LANGS: Lang[] = ['ca', 'es', 'en'];

interface TranslationFields {
  title: string;
  excerpt: string;
  content: string;
}

export interface NewsFormData {
  slug: string;
  image_url: string;
  news_url: string;
  attachment_url: string;
  attachment_name: string;
  sources: string;
  published: boolean;
  published_at: string | null;
  event_date: string;
  translations: Record<Lang, TranslationFields>;
}

export const createEmptyTranslations = (): Record<Lang, TranslationFields> => ({
  ca: { title: '', excerpt: '', content: '' },
  es: { title: '', excerpt: '', content: '' },
  en: { title: '', excerpt: '', content: '' }
});

export const createDefaultFormData = (): NewsFormData => ({
  slug: '',
  image_url: '',
  news_url: '',
  attachment_url: '',
  attachment_name: '',
  sources: '',
  published: false,
  published_at: null,
  event_date: '',
  translations: createEmptyTranslations()
});

export const generateSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export const getFileNameFromUrl = (url: string): string => {
  if (!url) return '';
  try {
    const pathname = new URL(url).pathname;
    const fileName = pathname.split('/').pop() || '';
    return decodeURIComponent(fileName);
  } catch {
    return '';
  }
};

const sanitizeTranslations = (translations: Record<Lang, TranslationFields>): Record<Lang, TranslationFields> =>
  AVAILABLE_LANGS.reduce(
    (acc, lang) => {
      const value = translations[lang] || { title: '', excerpt: '', content: '' };
      acc[lang] = {
        title: value.title.trim(),
        excerpt: value.excerpt.trim(),
        content: sanitizeRichTextHtml(value.content)
      };
      return acc;
    },
    createEmptyTranslations()
  );

export const normalizeTranslations = (
  value: unknown,
  fallbackEs: TranslationFields
): Record<Lang, TranslationFields> => {
  const empty = createEmptyTranslations();
  if (!value || typeof value !== 'object') {
    return { ...empty, es: { ...empty.es, ...fallbackEs } };
  }

  const source = value as Partial<Record<Lang, Partial<TranslationFields>>>;
  return {
    ca: { ...empty.ca, ...(source.ca || {}) },
    es: { ...empty.es, ...fallbackEs, ...(source.es || {}) },
    en: { ...empty.en, ...(source.en || {}) }
  };
};

export const AdminNewsEditorService = {
  async loadArticle(id: string): Promise<NewsFormData> {
    const { data, error } = await supabase.from('news').select('*').eq('id', id).single();
    if (error) throw error;

    const fallbackEs: TranslationFields = {
      title: data.title || '',
      excerpt: data.excerpt || '',
      content: data.content || ''
    };

    return {
      slug: data.slug || '',
      image_url: data.image_url || '',
      news_url: data.news_url || '',
      attachment_url: data.attachment_url || '',
      attachment_name: data.attachment_name || getFileNameFromUrl(data.attachment_url || ''),
      sources: data.sources || '',
      published: Boolean(data.published),
      published_at: data.published_at || null,
      event_date: toDateTimeLocalInputValue(data.event_date),
      translations: normalizeTranslations(data.translations, fallbackEs)
    };
  },

  async saveArticle(id: string | undefined, formData: NewsFormData): Promise<void> {
    const sanitizedTranslations = sanitizeTranslations(formData.translations);
    const primaryContent = sanitizedTranslations.es;

    if (!primaryContent.title) throw new Error('TITLE_REQUIRED');

    const finalSlug = generateSlug(formData.slug || primaryContent.title);
    if (!finalSlug) throw new Error('SLUG_REQUIRED');

    let slugQuery = supabase.from('news').select('id').eq('slug', finalSlug).limit(1);
    if (id && id !== 'new') {
      slugQuery = slugQuery.neq('id', id);
    }

    const { data: slugCollision, error: slugError } = await slugQuery;
    if (slugError) throw slugError;
    if (slugCollision && slugCollision.length > 0) throw new Error('SLUG_DUPLICATE');

    const now = new Date().toISOString();
    const payload = {
      title: primaryContent.title,
      slug: finalSlug,
      content: primaryContent.content,
      excerpt: primaryContent.excerpt,
      image_url: formData.image_url || null,
      news_url: formData.news_url.trim() || null,
      attachment_url: formData.attachment_url.trim() || null,
      attachment_name: formData.attachment_name.trim() || null,
      sources: formData.sources.trim() || null,
      published: formData.published,
      published_at: formData.published ? formData.published_at || now : null,
      event_date: fromDateTimeLocalInputValue(formData.event_date),
      translations: sanitizedTranslations,
      updated_at: now
    };

    if (id && id !== 'new') {
      const { error } = await supabase.from('news').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('news').insert([payload]);
      if (error) throw error;
    }
  }
};
