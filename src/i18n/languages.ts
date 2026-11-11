/** 支持的语言，与旧前端一致；名称用各语言自己的写法，不随界面语言翻译 */
export const LANGUAGES = [
  { code: 'zh', name: '简体中文' },
  { code: 'zh-CHT', name: '繁體中文' },
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
  { code: 'ja', name: '日本語' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'ru', name: 'Русский' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

/** 界面语言对应的 BCP 47 标签（<html lang>、Intl 格式化用） */
export const LANGUAGE_TAGS: Record<Language, string> = {
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

/** 源语言，也是缺译时的回退语言 */
export const SOURCE_LANGUAGE: Language = 'zh';

/** 设备语言不在支持列表里时用的语言 */
const UNKNOWN_DEVICE_LANGUAGE: Language = 'en';

export function isLanguage(value: string): value is Language {
  return LANGUAGES.some((l) => l.code === value);
}

/**
 * 决定界面语言：用户选过的优先；否则按设备语言（BCP 47，如 zh-Hans-CN、zh-TW、en-US）归一，
 * 识别不了用英文
 */
export function resolveLanguage(stored: string | null, deviceLocale: string | null): Language {
  if (stored && isLanguage(stored)) return stored;

  const parts = (deviceLocale ?? '').toLowerCase().split(/[-_]/);
  const [base] = parts;
  if (base === 'zh') {
    const traditional = parts.includes('hant') || (!parts.includes('hans') && parts.some((p) => p === 'tw' || p === 'hk' || p === 'mo'));
    return traditional ? 'zh-CHT' : 'zh';
  }
  return base && isLanguage(base) ? base : UNKNOWN_DEVICE_LANGUAGE;
}
