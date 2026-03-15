const REGIONAL_LANGUAGE_TAGS: Record<string, string> = {
  ca: 'ca-ES',
  es: 'es-ES',
  // Keep English labels while preserving Monday-first calendars.
  en: 'en-GB'
};

export function getRegionalLanguageTag(language?: string | null): string {
  if (!language) return 'es-ES';

  const baseLanguage = language.toLowerCase().split('-')[0];

  return REGIONAL_LANGUAGE_TAGS[baseLanguage] || 'es-ES';
}
