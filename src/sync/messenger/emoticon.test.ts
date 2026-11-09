import { describe, expect, it } from 'vitest';

import { emojiGroups, emoticonHtml, emoticonPacks, matchEmoticons, quickKeyword } from './emoticon';

const ORIGIN = 'https://a.example/';

describe('表情数据', () => {
  it('emoji 八个分类，第一个是人物', () => {
    const groups = emojiGroups();
    expect(groups.map((g) => g.type)).toEqual(['p', 'n', 'd', 's', 'a', 't', 'o', 'f']);
    expect(groups[0]!.emojis[0]).toBe('😀');
  });

  it('表情包图片地址按服务器拼', () => {
    const item = emoticonPacks(ORIGIN)[0]!.items[0]!;
    expect(item.src).toBe(`${ORIGIN}${item.asset}`);
    expect(item.asset).toMatch(/^images\/emoticon\/\w+\/[\w.]+$/);
  });
});

describe('快捷表情', () => {
  it('只有不含空白的短文字才匹配', () => {
    expect(quickKeyword('爱你')).toBe('爱你');
    expect(quickKeyword('爱 你')).toBe('');
    expect(quickKeyword('一二三四五六七八九')).toBe('');
  });

  it('按名称或关键词恰好相等，每套最多两个', () => {
    const packs = [
      { name: 'A', icon: '', items: [1, 2, 3].map((n) => ({ name: `x${n}`, asset: `a${n}`, src: `s${n}`, keys: ['好'] })) },
      { name: 'B', icon: '', items: [{ name: '好', asset: 'b', src: 'b' }, { name: '好的', asset: 'c', src: 'c' }] },
    ];
    expect(matchEmoticons(packs, '好').map((e) => e.asset)).toEqual(['a1', 'a2', 'b']);
    expect(matchEmoticons(packs, '')).toEqual([]);
  });

  it('真实数据里「爱你」能匹配到', () => {
    expect(matchEmoticons(emoticonPacks(ORIGIN), '爱你').length).toBeGreaterThan(0);
  });
});

it('发出的标签转义属性', () => {
  expect(emoticonHtml({ name: 'a"b', asset: 'emosearch', src: 'https://x/y?a=1&b=2' })).toBe(
    '<img class="emoticon" data-asset="emosearch" data-name="a&quot;b" src="https://x/y?a=1&amp;b=2"/>',
  );
});
