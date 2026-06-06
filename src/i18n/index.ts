import { en } from './locales/en';
import { zh } from './locales/zh';

export type Locale = 'en' | 'zh';

const dictionaries: Record<Locale, Record<string, string>> = { en, zh };

let currentLocale: Locale = (typeof navigator !== 'undefined' && navigator.language.startsWith('zh')) ? 'zh' : 'en';

type LocaleListener = (locale: Locale) => void;
const listeners: LocaleListener[] = [];

export function t(key: string): string {
  return dictionaries[currentLocale][key] ?? dictionaries['en'][key] ?? key;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  if (locale === currentLocale) return;
  currentLocale = locale;
  for (const fn of listeners) fn(locale);
}

export function onLocaleChange(fn: LocaleListener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
