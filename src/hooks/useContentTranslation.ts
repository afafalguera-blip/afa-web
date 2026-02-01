import { useTranslation } from 'react-i18next';

export function useContentTranslation() {
  const { i18n } = useTranslation();
  
  // Get the base language (es, ca, en)
  const lang = i18n.language ? i18n.language.split('-')[0] : 'ca';

  /**
   * Returns the localized content for a given field.
   * Falls back to 'es' or the base field if the localized version is missing.
   * 
   * @param item - The object containing the data (Activity, ShopProduct, etc.)
   * @param field - The base field name (e.g., 'title', 'description')
   */
  function tContent<T>(item: T, field: string): string {
    if (!item) return '';

    const localizedKey = `${field}_${lang}` as keyof T;
    const spanishKey = `${field}_es` as keyof T;
    const catalanKey = `${field}_ca` as keyof T; // Source of truth might be Catalan in some contexts?
    const legacyKey = field as keyof T;

    // 1. Try variable for current language
    if (item[localizedKey] && typeof item[localizedKey] === 'string' && (item[localizedKey] as string).trim() !== '') {
        return item[localizedKey] as unknown as string;
    }

    // 2. Fallback to Catalan (primary language usually)
    if (item[catalanKey] && typeof item[catalanKey] === 'string' && (item[catalanKey] as string).trim() !== '') {
        return item[catalanKey] as unknown as string;
    }

    // 3. Fallback to Spanish (often the populated default in migration)
    if (item[spanishKey] && typeof item[spanishKey] === 'string' && (item[spanishKey] as string).trim() !== '') {
        return item[spanishKey] as unknown as string;
    }

    // 4. Last resort: legacy field
    if (item[legacyKey]) {
        return String(item[legacyKey]);
    }

    return '';
  }

  return { tContent, lang };
}
