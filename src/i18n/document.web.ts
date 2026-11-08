import type { Language } from './languages';

const HTML_LANG: Record<Language, string> = {
  zh: 'zh-Hans',
  'zh-CHT': 'zh-Hant',
  en: 'en',
  ko: 'ko',
  ja: 'ja',
  de: 'de',
  fr: 'fr',
  id: 'id',
  ru: 'ru',
};

/** 同步 <html lang>：影响读屏发音、浏览器翻译提示和字体回退 */
export function applyDocumentLanguage(language: Language): void {
  document.documentElement.lang = HTML_LANG[language];
}
