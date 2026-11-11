import { LANGUAGE_TAGS, type Language } from './languages';

/** 同步 <html lang>：影响读屏发音、浏览器翻译提示和字体回退 */
export function applyDocumentLanguage(language: Language): void {
  document.documentElement.lang = LANGUAGE_TAGS[language];
}
