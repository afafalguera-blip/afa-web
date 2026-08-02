import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { getRegionalLanguageTag } from '../../utils/locale';

const syncDocumentLanguage = (language?: string) => {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = getRegionalLanguageTag(language);
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ca',
    supportedLngs: ['ca', 'es', 'en'],
    interpolation: {
      escapeValue: false
    },
    detection: {
      // Catalan is the institutional default: never auto-switch from the
      // browser locale. Honor only an explicit choice persisted in
      // localStorage/cookie; otherwise fall through to fallbackLng = 'ca'.
      order: ['localStorage', 'cookie'],
      lookupLocalStorage: 'i18nextLng',
      lookupCookie: 'i18next',
      caches: ['localStorage', 'cookie']
    },
    backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
    }
  })
  .then(() => {
    syncDocumentLanguage(i18n.resolvedLanguage || i18n.language);
  });

// Update lang attribute in HTML
i18n.on('languageChanged', (lng) => {
  syncDocumentLanguage(lng);
});

const LNG_CACHE_KEY = 'i18nextLng';
const LNG_COOKIE = 'i18next';
// Holds the language the visitor was using on the public site while the admin
// panel forces Spanish. Needed because detection.caches persists every
// changeLanguage(), so without stashing it a visit to /admin would leave the
// public site permanently in Spanish instead of the institutional Catalan.
const PUBLIC_LNG_KEY = 'afa_public_lng';

const clearLanguageCaches = () => {
  window.localStorage.removeItem(LNG_CACHE_KEY);
  if (typeof document !== 'undefined') {
    document.cookie = `${LNG_COOKIE}=; path=/; max-age=0`;
  }
};

/** Forces the admin language, remembering the public one so it can be restored. */
export const setAdminLanguageOverride = (adminLanguage = 'es') => {
  if (typeof window === 'undefined') return;

  if (window.localStorage.getItem(PUBLIC_LNG_KEY) === null) {
    // Empty string = the visitor never picked a language explicitly.
    window.localStorage.setItem(PUBLIC_LNG_KEY, window.localStorage.getItem(LNG_CACHE_KEY) ?? '');
  }

  if (i18n.language !== adminLanguage) {
    void i18n.changeLanguage(adminLanguage);
  }
};

/** Undoes setAdminLanguageOverride(). Safe to call when no override is active. */
export const restorePublicLanguage = () => {
  if (typeof window === 'undefined') return;

  const saved = window.localStorage.getItem(PUBLIC_LNG_KEY);
  if (saved === null) return;
  window.localStorage.removeItem(PUBLIC_LNG_KEY);

  if (saved) {
    if (i18n.language !== saved) void i18n.changeLanguage(saved);
    return;
  }

  void i18n.changeLanguage('ca').then(clearLanguageCaches);
};

// The override is undone on AdminLayout unmount, but a tab closed inside /admin
// never unmounts. Recover on the next non-admin load.
if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
  restorePublicLanguage();
}

export default i18n;
