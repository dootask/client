import { describe, expect, it } from 'vitest';

import { letterGroups, matchesUser, nameInitials, userLetter } from './list';

describe('用户字母分组', () => {
  it.each([
    ['a', 'A'], ['Z', 'Z'], [undefined, '#'], [null, '#'], ['', '#'],
    ['1', '#'], ['中文', '#'], ['AB', '#'], [' a ', '#'], ['#', '#'],
  ])('仅单个英文字母有效：%s', (az, expected) => {
    expect(userLetter(az)).toBe(expected);
  });

  it('按字母排序且井号最后，同组按编号排序并保留重复编号的最新记录', () => {
    const users = [
      { userid: 9, az: null, nickname: '未分组九' },
      { userid: 5, az: 'b', nickname: '乙五' },
      { userid: 3, az: 'a', nickname: '旧名' },
      { userid: 1, az: 'A', nickname: '甲一' },
      { userid: 3, az: 'A', nickname: '新名' },
      { userid: 2, az: 'B', nickname: '乙二' },
      { userid: 8, az: '1', nickname: '未分组八' },
    ];
    const original = structuredClone(users);
    Object.freeze(users);
    expect(letterGroups(users)).toEqual([
      { letter: 'A', users: [users[3], users[4]] },
      { letter: 'B', users: [users[5], users[1]] },
      { letter: '#', users: [users[6], users[0]] },
    ]);
    expect(users).toEqual(original);
  });

  it('重复编号的字母改变时只保留最新分组', () => {
    expect(letterGroups([{ userid: 1, az: 'A' }, { userid: 1, az: 'B' }])).toEqual([{ letter: 'B', users: [{ userid: 1, az: 'B' }] }]);
  });

  it('空列表没有分组', () => {
    expect(letterGroups([])).toEqual([]);
  });
});

describe('姓名首字母', () => {
  it.each([
    ['黄晓', 'hx'], ['李四', 'ls'], ['张建伟', 'zjw'],
    ['李四 A-9', 'lsa9'], ['ABC', 'abc'], ['', ''], [' - ', ''],
  ])('提取中文姓名及混合字符：%s', (name, expected) => {
    expect(nameInitials(name)).toBe(expected);
  });
});

describe('用户搜索匹配', () => {
  const user = { nickname: '黄晓', email: 'HX@Example.com', profession: '产品设计师', pinyin: 'huangxiao' };

  it.each(['黄', '晓', '黄晓', 'ANGXI', '  HUANGXIAO  ', 'hx', 'EXAMPLE', '设计', '', '   '])('中文、全拼子串、首字母、邮箱、职位及空词命中：%s', (keyword) => {
    expect(matchesUser(user, keyword)).toBe(true);
  });

  it.each([
    ['黄晓', 'huangxiao', 'hx'], ['李四', 'lisi', 'ls'], ['张建伟', 'zhangjianwei', 'zjw'],
  ])('首字母按姓名提取，不依赖邮箱或有分隔的拼音：%s', (nickname, pinyin, keyword) => {
    expect(matchesUser({ nickname, pinyin }, keyword)).toBe(true);
    expect(matchesUser({ nickname }, keyword.toUpperCase())).toBe(true);
  });

  it('空值字段不影响匹配，无关关键词不命中', () => {
    expect(matchesUser({ nickname: '李四', email: null, profession: null, pinyin: null }, 'ls')).toBe(true);
    expect(matchesUser({ nickname: '李四' }, '黄晓')).toBe(false);
    expect(matchesUser(user, '不存在的职位')).toBe(false);
  });

  it('匹配不修改原用户数据', () => {
    const original = { ...user };
    const frozen = Object.freeze({ ...user });
    expect(matchesUser(frozen, '设计')).toBe(true);
    expect(frozen).toEqual(original);
  });
});
