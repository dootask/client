import { describe, expect, it } from 'vitest';

import { findInBlocks } from './find';
import type { Block } from './types';

describe('findInBlocks', () => {
  const blocks: Block[] = [
    { t: 'p', runs: [{ text: 'Abc abc', b: true }] },
    { t: 'code', lang: '', text: 'x = abc' },
  ];

  it('不区分大小写，按出现顺序标出当前和其余命中，记下所在块', () => {
    const { blocks: marked, matches } = findInBlocks(blocks, 'abc', 1);
    expect(matches).toEqual([0, 0, 1]);
    expect(marked[0]).toEqual({ t: 'p', runs: [{ text: 'Abc', b: true, hl: 'match' }, { text: ' ', b: true }, { text: 'abc', b: true, hl: 'current' }] });
    expect(marked[1]).toEqual({ t: 'code', lang: '', text: 'x = abc', runs: [{ text: 'x = ' }, { text: 'abc', hl: 'match' }] });
  });

  it('空查找原样返回', () => {
    expect(findInBlocks(blocks, '', 0)).toEqual({ blocks, matches: [] });
  });
});
