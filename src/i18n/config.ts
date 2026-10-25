/**
 * i18next Configuration
 *
 * Sets up internationalization with German (primary) and English.
 * Uses browser language detection as fallback, but defaults to German.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import de from './locales/de.json';
import en from './locales/en.json';

import './types';

export const SUPPORTED_LANGUAGES = ['de', 'en'] as const;
export const DEFAULT_LANGUAGE = 'de';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    // A regional variant such as "de-DE" must resolve to the language we
    // actually ship, not to a namespace we do not have.
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false, // React already handles XSS protection
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
