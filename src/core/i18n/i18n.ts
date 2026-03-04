import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

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
  });

// Update lang attribute in HTML
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
