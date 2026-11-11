import { describe, expect, it } from 'vitest';

import { joinNames } from './lists';

describe('joinNames', () => {
  it('全部列出时按语言连接', () => {
    expect(joinNames(['甲', '乙', '丙'], 'zh')).toBe('甲、乙和丙');
    expect(joinNames(['A', 'B', 'C'], 'en')).toBe('A, B, and C');
    expect(joinNames(['A'], 'en')).toBe('A');
  });
  it('截断时只用分隔符，后面接 more', () => {
    expect(joinNames(['甲', '乙'], 'zh', '+3位')).toBe('甲、乙 +3位');
    expect(joinNames(['A', 'B'], 'en', '+3 more')).toBe('A, B +3 more');
  });
});
