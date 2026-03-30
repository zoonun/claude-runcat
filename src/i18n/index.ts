import type { Locale } from '../types.js';
import { en } from './en.js';
import { ko } from './ko.js';
import { ja } from './ja.js';
import { zh } from './zh.js';

const locales: Record<Locale, Record<string, string>> = { en, ko, ja, zh };
const SUPPORTED: Set<string> = new Set(['en', 'ko', 'ja', 'zh']);

export function detectLocale(configLocale: Locale | 'auto'): Locale {
  if (configLocale !== 'auto' && SUPPORTED.has(configLocale)) return configLocale;
  const lang = (process.env.LANG || '').split(/[_.]/)[0];
  if (SUPPORTED.has(lang)) return lang as Locale;
  return 'en';
}

export function createTranslator(locale: Locale): (key: string) => string {
  const dict = locales[locale] || locales.en;
  const fallback = locales.en;
  return (key: string) => dict[key] ?? fallback[key] ?? key;
}
