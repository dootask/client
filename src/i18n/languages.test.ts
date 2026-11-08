import { describe, expect, it } from 'vitest';

import { resolveLanguage } from './languages';

describe('resolveLanguage', () => {
  it('用户选过的语言优先', () => {
    expect(resolveLanguage('ja', 'en-US')).toBe('ja');
    expect(resolveLanguage('zh-CHT', 'zh-CN')).toBe('zh-CHT');
  });

  it('选过的语言不认识时按设备语言', () => {
    expect(resolveLanguage('xx', 'ko-KR')).toBe('ko');
  });

  it('中文按简繁归一', () => {
    expect(resolveLanguage(null, 'zh')).toBe('zh');
    expect(resolveLanguage(null, 'zh-CN')).toBe('zh');
    expect(resolveLanguage(null, 'zh-Hans-HK')).toBe('zh');
    expect(resolveLanguage(null, 'zh-Hant')).toBe('zh-CHT');
    expect(resolveLanguage(null, 'zh-TW')).toBe('zh-CHT');
    expect(resolveLanguage(null, 'zh_HK')).toBe('zh-CHT');
    expect(resolveLanguage(null, 'zh-Hant-CN')).toBe('zh-CHT');
  });

  it('其他语言取主语言', () => {
    expect(resolveLanguage(null, 'en-GB')).toBe('en');
    expect(resolveLanguage(null, 'fr-CA')).toBe('fr');
    expect(resolveLanguage(null, 'id-ID')).toBe('id');
    expect(resolveLanguage(null, 'ru')).toBe('ru');
  });

  it('识别不了用英文', () => {
    expect(resolveLanguage(null, 'es-ES')).toBe('en');
    expect(resolveLanguage(null, '')).toBe('en');
    expect(resolveLanguage(null, null)).toBe('en');
  });
});
