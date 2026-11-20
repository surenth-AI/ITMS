import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en';
import it from './locales/it';
import ro from './locales/ro';
import nl from './locales/nl';

export type SupportedLanguage = 'en' | 'it' | 'ro' | 'nl';

export const LANGUAGES: {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
}[] = [
  { code: 'en', name: 'English',   nativeName: 'English',    flag: '🇬🇧', region: 'United Kingdom' },
  { code: 'it', name: 'Italian',   nativeName: 'Italiano',   flag: '🇮🇹', region: 'Italia / Rome' },
  { code: 'ro', name: 'Romanian',  nativeName: 'Română',     flag: '🇷🇴', region: 'România' },
  { code: 'nl', name: 'Dutch',     nativeName: 'Nederlands', flag: '🇳🇱', region: 'Nederland' },
];

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      it: { translation: it },
      ro: { translation: ro },
      nl: { translation: nl },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React Native already escapes
    },
    compatibilityJSON: 'v4',
  });

export default i18n;
