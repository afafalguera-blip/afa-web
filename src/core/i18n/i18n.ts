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
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
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

export default i18n;
