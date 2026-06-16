import type { InscriptionContentBlock, Lang } from '../services/ConfigService';

/**
 * Returns a resolver: given a content field + an i18n fallback key, returns the
 * admin-configured text when present (non-empty), otherwise the i18n string.
 */
export function makeContentResolver(
  block: InscriptionContentBlock | undefined,
  t: (key: string) => string,
) {
  return (field: keyof InscriptionContentBlock, i18nKey: string): string => {
    const v = block?.[field];
    return v && v.trim().length > 0 ? v : t(i18nKey);
  };
}

/** Picks the value for the active language, falling back to Catalan. */
export function pickLang<T>(byLang: { ca: T; es: T; en: T }, lang: string): T {
  return byLang[(lang as Lang)] ?? byLang.ca;
}
