import { describe, expect, it } from 'vitest';

import { bodyImages, bodyPictures } from './gallery';

const img = (url?: string) => ({ t: 'img' as const, src: 's', width: 1, height: 1, url, emoticon: !url });

describe('bodyImages', () => {
  it('图片消息取原图', () => {
    expect(bodyImages({ kind: 'image', src: 's', width: 1, height: 1, url: 'a' })).toEqual(['a']);
  });

  it('正文里的图（含引用、列表里的），跳过表情', () => {
    const blocks = [
      img('a'),
      img(),
      { t: 'quote' as const, blocks: [img('b')] },
      { t: 'list' as const, items: [{ mark: 'bullet' as const, blocks: [img('c')] }] },
    ];
    expect(bodyImages({ kind: 'rich', blocks })).toEqual(['a', 'b', 'c']);
  });

  it('其他消息没有', () => {
    expect(bodyImages({ kind: 'file', name: 'f', ext: 'txt', size: 1, url: 'u' })).toEqual([]);
  });
});

describe('bodyPictures', () => {
  it('带上缩略图', () => {
    expect(bodyPictures({ kind: 'image', src: 't', width: 1, height: 1, url: 'a' })).toEqual([{ src: 't', url: 'a' }]);
    expect(bodyPictures({ kind: 'rich', blocks: [img('a'), img()] })).toEqual([{ src: 's', url: 'a' }]);
  });
});
