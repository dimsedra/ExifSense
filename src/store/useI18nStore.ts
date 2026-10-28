import { create } from 'zustand';
import enLocale from '../locales/en.json';
import idLocale from '../locales/id.json';
import arLocale from '../locales/ar.json';

export const LANG_STORAGE_KEY = 'exifsense_lang';

export type SupportedLanguage = 'en' | 'id' | 'ar';
export type TextDirection = 'ltr' | 'rtl';

export interface I18nStoreState {
  currentLang: SupportedLanguage;
  direction: TextDirection;
  dictionary: Record<string, Record<string, string>>;

  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string, params?: Record<string, unknown>, namespace?: string) => string;
}

const dictionaries: Record<SupportedLanguage, Record<string, Record<string, string>>> = {
  en: enLocale as unknown as Record<string, Record<string, string>>,
  id: idLocale as unknown as Record<string, Record<string, string>>,
  ar: arLocale as unknown as Record<string, Record<string, string>>,
};

export function interpolateParams(
  template: string,
  params?: Record<string, unknown>
): string {
  if (!params) return template;
  return Object.entries(params).reduce((str, [k, v]) => {
    return str.replace(new RegExp(`{${k}}`, 'g'), String(v));
  }, template);
}

export const useI18nStore = create<I18nStoreState>((set, get) => ({
  currentLang: 'en',
  direction: 'ltr',
  dictionary: dictionaries['en'],

  setLanguage: async (lang: SupportedLanguage) => {
    const direction: TextDirection = lang === 'ar' ? 'rtl' : 'ltr';
    const dict = dictionaries[lang] || dictionaries['en'];

    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {}

    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = lang;
      document.documentElement.dir = direction;
    }

    set({
      currentLang: lang,
      direction,
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
