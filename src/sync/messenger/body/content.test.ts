import { describe, expect, it } from 'vitest';

import type { Msg } from '../../api/dialog';
import { msgContent, reactions, textBlocks } from './content';

const ctx = { userId: 3, origin: 'https://example.com/' };

const msg = (over: Partial<Msg> & { msg: unknown }): Msg => ({ id: 1, dialog_id: 1, userid: 2, type: 'text', created_at: '2026-11-08 10:00:00', ...over }) as Msg;

describe('textBlocks（编辑器 HTML）', () => {
  it('相邻段落合并为一段，空段落是空行', () => {
    expect(textBlocks('<p>a</p><p><br></p><p>b</p>', false, ctx)).toEqual([{ t: 'p', runs: [{ text: 'a\n\nb' }] }]);
  });

  it('加粗、链接、@ 自己和别人', () => {
    const blocks = textBlocks('<p><strong>粗</strong> 看 https://a.com/x <span class="mention user" data-id="3">@我</span><span class="mention user" data-id="9">@他</span></p>', false, ctx);
    expect(blocks).toEqual([
      {
        t: 'p',
        runs: [{ text: '粗', b: true }, { text: ' 看 ' }, { text: 'https://a.com/x', href: 'https://a.com/x' }, { text: ' ' }, { text: '@我', mention: 'me', id: 3 }, { text: '@他', mention: 'user', id: 9 }],
      },
    ]);
  });

  it('段落里的图片拆成图片块，带尺寸和原图', () => {
    const blocks = textBlocks('<p>前<img class="browse" src="{{RemoteURL}}uploads/a.jpg_thumb.jpg" width="100" height="50">后</p>', false, ctx);
    expect(blocks).toEqual([
      { t: 'p', runs: [{ text: '前' }] },
      { t: 'img', src: 'https://example.com/uploads/a.jpg_thumb.jpg', width: 100, height: 50, url: 'https://example.com/uploads/a.jpg' },
      { t: 'p', runs: [{ text: '后' }] },
    ]);
  });

  it('过长的本站图取裁剪缩略图，比例收窄', () => {
    const [img] = textBlocks('<img src="https://example.com/u/a.jpg" width="100" height="1000">', false, ctx);
    expect(img).toMatchObject({ t: 'img', src: 'https://example.com/u/a.jpg/crop/ratio:3,percentage:320x0', width: 100, height: 300 });
  });

  it('Quill 列表：类型在 li 上，缩进各自计数', () => {
    const [list] = textBlocks('<ol><li data-list="ordered">a</li><li data-list="ordered" class="ql-indent-1">b</li><li data-list="ordered">c</li><li data-list="unchecked">d</li></ol>', false, ctx);
    expect(list).toEqual({
      t: 'list',
      items: [
        { mark: 'ordered', num: 1, blocks: [{ t: 'p', runs: [{ text: 'a' }] }] },
        { mark: 'ordered', num: 1, indent: 1, blocks: [{ t: 'p', runs: [{ text: 'b' }] }] },
        { mark: 'ordered', num: 2, blocks: [{ t: 'p', runs: [{ text: 'c' }] }] },
        { mark: 'unchecked', index: 3, blocks: [{ t: 'p', runs: [{ text: 'd' }] }] },
      ],
    });
  });

  it('逐行的引用合并成一个', () => {
    expect(textBlocks('<blockquote>a</blockquote><blockquote>b</blockquote>', false, ctx)).toEqual([{ t: 'quote', blocks: [{ t: 'p', runs: [{ text: 'a\nb' }] }] }]);
  });
});

describe('textBlocks（Markdown）', () => {
  it('标题、代码块、表格、空白折叠', () => {
    const blocks = textBlocks('# 标题\n\n段落  一\n二\n\n```js\nconst a = 1;\n```\n\n| a | b |\n| - | - |\n| 1 | 2 |', true, ctx);
    expect(blocks).toEqual([
      { t: 'h', level: 1, runs: [{ text: '标题' }] },
      { t: 'p', runs: [{ text: '段落 一\n二' }] },
      { t: 'code', lang: '', text: 'const a = 1;' },
      { t: 'table', head: true, rows: [[[{ text: 'a' }], [{ text: 'b' }]], [[{ text: '1' }], [{ text: '2' }]]] },
    ]);
  });

  it('思考过程块', () => {
    expect(textBlocks(':::reasoning\n想一想\n:::\n\n答案', true, ctx)).toEqual([
      { t: 'reasoning', blocks: [{ t: 'p', runs: [{ text: '想一想' }] }] },
      { t: 'p', runs: [{ text: '答案' }] },
    ]);
  });

  it('行内代码不合并，列表嵌套', () => {
    const blocks = textBlocks('- a `b`\n  - c', true, ctx);
    expect(blocks).toEqual([
      {
        t: 'list',
        items: [{ mark: 'bullet', blocks: [{ t: 'p', runs: [{ text: 'a ' }, { text: 'b', code: true }] }, { t: 'list', items: [{ mark: 'bullet', blocks: [{ t: 'p', runs: [{ text: 'c' }] }] }] }] }],
      },
    ]);
  });
});

describe('msgContent', () => {
  it('单张表情图是贴纸', () => {
    const c = msgContent(msg({ msg: { text: '<img class="emoticon" width="240" height="240" src="{{RemoteURL}}images/e.gif" alt="撒花"/>' } }), ctx);
    expect(c.body).toMatchObject({ kind: 'rich', sticker: true });
  });

  it('AI 生成中的占位', () => {
    expect(msgContent(msg({ msg: { text: '...', type: 'md' } }), ctx).body).toEqual({ kind: 'typing' });
  });

  it('图片、文件、语音', () => {
    expect(msgContent(msg({ type: 'file', msg: { type: 'img', thumb: 'https://example.com/a.jpg_thumb.jpg', path: 'https://example.com/a.jpg', width: 20, height: 10 } }), ctx).body).toEqual({
      kind: 'image',
      src: 'https://example.com/a.jpg_thumb.jpg',
      width: 20,
      height: 10,
      url: 'https://example.com/a.jpg',
    });
    expect(msgContent(msg({ type: 'file', msg: { name: 'a.PDF', ext: 'PDF', size: 1024.5, path: 'uploads/a.pdf' } }), ctx).body).toEqual({ kind: 'file', name: 'a.PDF', ext: 'pdf', size: 1024.5, url: 'https://example.com/uploads/a.pdf' });
    expect(msgContent(msg({ type: 'record', msg: { path: 'https://example.com/r.m4a', duration: 3413 } }), ctx).body).toEqual({ kind: 'record', url: 'https://example.com/r.m4a', duration: 3413, text: '' });
  });

  it('回复引用和转发来源', () => {
    const c = msgContent(msg({ reply_id: 7, forward_id: 5, msg: { text: '<p>x</p>', reply_data: { id: 7, userid: 9, type: 'text', msg: { text: '<p>原文</p>' } }, forward_data: { userid: 4, show: 1 } } } as never), ctx);
    expect(c.reply).toEqual({ id: 7, userid: 9, name: '', preview: { labels: [], text: '原文' } });
    expect(c.forward).toEqual({ userid: 4 });
  });

  it('系统消息：待办设给别人', () => {
    const c = msgContent(msg({ type: 'todo', userid: 3, msg: { action: 'add', data: { type: 'text', msg: { text: '内容' }, userids: '5,6' } } }), ctx);
    expect(c.body).toEqual({ kind: 'system', parts: [{ userid: 3 }, { label: 'todoAdd' }, { preview: { labels: [], text: '内容' } }, { label: 'todoTarget' }, { userid: 5 }, { userid: 6 }] });
  });

  it('正文对象不变时沿用上次的结果', () => {
    const body = { text: '<p>a</p>' };
    expect(msgContent(msg({ msg: body }), ctx)).toBe(msgContent(msg({ id: 1, msg: body }), ctx));
  });
});

it('表情回应带上自己有没有点', () => {
  expect(reactions(msg({ msg: {}, emoji: [{ symbol: '👌', userids: [3, 4] }, { symbol: 'x', userids: [] }] } as never), 3)).toEqual([{ symbol: '👌', count: 2, mine: true }]);
});
