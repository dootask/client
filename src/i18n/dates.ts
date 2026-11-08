import { type Language } from './languages';

/** 界面语言对应的 BCP 47 标签，给 Intl 用 */
const LOCALE_TAGS: Record<Language, string> = {
  zh: 'zh-CN',
  'zh-CHT': 'zh-TW',
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  de: 'de-DE',
  fr: 'fr-FR',
  id: 'id-ID',
  ru: 'ru-RU',
};

export interface DateFormats {
  /** 时:分，24 小时制 */
  time: (d: Date) => string;
  /** 月日（今年） */
  monthDay: (d: Date) => string;
  /** 年月日（跨年） */
  full: (d: Date) => string;
}

const cache = new Map<Language, DateFormats>();

/** 按界面语言排的日期格式（docs/ui-spec.md 第 7 节）；格式化器按语言缓存，列表里每行直接用 */
export function dateFormats(language: Language): DateFormats {
  let formats = cache.get(language);
  if (!formats) {
    const tag = LOCALE_TAGS[language];
    const time = new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const monthDay = new Intl.DateTimeFormat(tag, { month: 'short', day: 'numeric' });
    const full = new Intl.DateTimeFormat(tag, { year: 'numeric', month: 'short', day: 'numeric' });
    formats = { time: (d) => time.format(d), monthDay: (d) => monthDay.format(d), full: (d) => full.format(d) };
    cache.set(language, formats);
  }
  return formats;
}
