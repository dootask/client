import { describe, expect, it } from 'vitest';

import { defaultCustom, presetAt, remindOf, remindTime, serverTime } from './remind';

const at = (h: number, m = 0, day = 10) => new Date(2026, 10, day, h, m).getTime();

describe('remind', () => {
  it('今晚已过 20 点算明晚', () => {
    expect(presetAt('tonight', at(19))).toBe(at(20));
    expect(presetAt('tonight', at(21))).toBe(at(20, 0, 11));
    expect(presetAt('tomorrow', at(23))).toBe(at(9, 0, 11));
  });

  it('默认自定义时间取半小时后的下一个整点或半点', () => {
    expect(defaultCustom(at(10, 10)).getTime()).toBe(at(11));
    expect(defaultCustom(at(10, 30)).getTime()).toBe(at(11));
    expect(defaultCustom(at(10, 31)).getTime()).toBe(at(11, 30));
  });

  it('已有时间对上预设就选预设，否则单列', () => {
    const now = at(12);
    expect(remindOf(at(20), now)).toBe('tonight');
    expect(remindOf(at(9, 0, 11), now)).toBe('tomorrow');
    expect(remindOf(at(15), now)).toBe('current');
    expect(remindOf(at(11), now)).toBe('1h');
  });

  it('不提醒为 null，其余按本机时区写成服务端格式', () => {
    expect(serverTime(remindTime('none', new Date(), 0))).toBeNull();
    expect(serverTime(remindTime('custom', new Date(at(8, 5)), 0))).toBe('2026-11-10 08:05:00');
  });
});
