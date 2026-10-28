import { create } from 'zustand';

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

export function interpolateParams(
  template: string,
  params?: Record<string, unknown>
): string {
  if (!params) return template;
  return Object.entries(params).reduce((str, [k, v]) => {
    return str.replace(new RegExp(`{${k}}`, 'g'), String(v));
  }, template);
}

export const useI18nStore = create<I18nStoreState>((_set, get) => ({
  currentLang: 'en',
  direction: 'ltr',
  dictionary: {},

  setLanguage: async () => {},

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
