import { useTranslation } from 'react-i18next';

/**
 * `t()` widened to accept keys that are not yet present in the locale JSONs.
 * i18next types keys against `public/locales/ca/translation.json`, so panels
 * introducing new copy pass an inline default until the JSONs catch up.
 */
export type LooseT = (key: string, defaultValue?: string) => string;

export function useSettingsT(): LooseT {
  const { t } = useTranslation();
  return t as unknown as LooseT;
}

export default useSettingsT;
