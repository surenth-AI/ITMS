import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import i18n, { SupportedLanguage } from '../i18n';

const LANGUAGE_KEY = 'itms_language';

interface LanguageState {
  language: SupportedLanguage;
  isLoaded: boolean;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  restoreLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',
  isLoaded: false,

  setLanguage: async (lang: SupportedLanguage) => {
    await i18n.changeLanguage(lang);
    set({ language: lang });
    try {
      await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
    } catch {
      // SecureStore may not be available in Expo Go web
    }
  },

  restoreLanguage: async () => {
    try {
      const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
      if (stored) {
        const lang = stored as SupportedLanguage;
        await i18n.changeLanguage(lang);
        set({ language: lang, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },
}));
