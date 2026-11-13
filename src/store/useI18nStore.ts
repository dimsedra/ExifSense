import { create } from 'zustand';
import enLocale from '../locales/en.json';
import idLocale from '../locales/id.json';

export const LANG_STORAGE_KEY = 'exifsense_lang';

export type SupportedLanguage = 'en' | 'id';

export interface I18nStoreState {
  currentLang: SupportedLanguage;
  dictionary: Record<string, Record<string, string>>;

  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string, params?: Record<string, unknown>, namespace?: string) => string;
}

const dictionaries: Record<SupportedLanguage, Record<string, Record<string, string>>> = {
  en: enLocale as unknown as Record<string, Record<string, string>>,
  id: idLocale as unknown as Record<string, Record<string, string>>,
};

export function interpolateParams(
  template: string,
  params?: Record<string, unknown>
): string {
  if (!params) return template;
  return Object.entries(params).reduce((str, [k, v]) => {
    return str.replaceAll(`{${k}}`, () => String(v));
  }, template);
}

export const useI18nStore = create<I18nStoreState>((set, get) => ({
  currentLang: 'en',
  dictionary: dictionaries['en'],

  setLanguage: async (lang: SupportedLanguage) => {
    const activeLang: SupportedLanguage =
      lang === 'en' || lang === 'id' ? lang : 'en';
    const dict = dictionaries[activeLang];

    try {
      localStorage.setItem(LANG_STORAGE_KEY, activeLang);
    } catch (err) {
      console.warn('Failed to persist language preference to localStorage:', err);
    }

    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = activeLang;
      document.title = dict['ui']?.['title'] || 'ExifSense | Photo Analysis & Privacy';
    }

    set({
      currentLang: activeLang,
      dictionary: dict,
    });
  },

  t: (key, params, namespace) => {
    const { dictionary } = get();
    if (!dictionary) return key;

    const raw =
      (namespace && dictionary[namespace]?.[key]) ||
      dictionary['ui']?.[key] ||
      dictionary['reports']?.[key] ||
      dictionary['narratives']?.[key] ||
      key;

    return interpolateParams(raw, params);
  },
}));
