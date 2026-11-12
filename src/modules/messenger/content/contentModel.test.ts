import { describe, expect, it } from 'vitest';

import type { Dialog, Msg } from '../../../sync/api/dialog';
import type { MsgBody } from '../../../sync/messenger/body';
import { availableMsgTypes } from '../../../sync/messenger/rules';
import { appendPage, earlierCursor, firstHref, highlightParts, pictureRows, resultPreview } from './contentModel';

const msg = (id: number, day = '2026-11-12'): Msg => ({ id, dialog_id: 1, userid: 1, type: 'text', msg: { text: '内容' }, created_at: `${day} 12:00:00` });
const image = (url: string): MsgBody => ({ kind: 'image', src: `thumb-${url}`, url, width: 120, height: 120 });

describe('会话搜索摘要', () => {
  it('中文命中前保留十二个字符，大小写不敏感', () => {
    expect(highlightParts('0123456789012345测试消息', '测试')).toEqual({ before: '…456789012345', match: '测试', after: '消息' });
    expect(highlightParts('abc HELLO xyz', 'hello')).toEqual({ before: 'abc ', match: 'HELLO', after: ' xyz' });
  });
  it('分词命中但没有整串关键词时保留原文，空关键词不高亮', () => {
    expect(highlightParts('测试消息', '测试全文').match).toBe('');
    expect(highlightParts('测试消息', '').before).toBe('测试消息');
  });
  it('长正文不截掉五十字以后的命中，样式片段相接', () => {
    const body: MsgBody = { kind: 'rich', blocks: [{ t: 'p', runs: [{ text: '长'.repeat(80) }, { text: '测试', b: true }] }] };
    expect(resultPreview(msg(1), body).text).toBe(`${'长'.repeat(80)}测试`);
  });
});

describe('分类分页', () => {
  it('最旧消息的前一编号作游标，没更早的就到头', () => {
    expect(earlierCursor([{ ...msg(80), prev_id: 1 }])).toBe(79);
    expect(earlierCursor([msg(80)])).toBe(0);
    expect(earlierCursor([])).toBe(0);
    expect(earlierCursor([{ ...msg(80), prev_id: 0 }])).toBe(0);
  });
  it('追加页去掉重叠消息且不改变接口顺序', () => {
    expect(appendPage([msg(3), msg(2)], [msg(2), msg(1)]).map((m) => m.id)).toEqual([3, 2, 1]);
  });
  it('只显示存在的分类，保留当前分类和我的待办数', () => {
    const dialog = { id: 1, type: 'group', has_image: 1, has_link: 1, todo_num: 2 } as Dialog;
    expect(availableMsgTypes(dialog)).toEqual(['todo', 'image', 'link']);
    expect(availableMsgTypes(dialog, 'tag')).toEqual(['todo', 'tag', 'image', 'link']);
    expect(availableMsgTypes({ id: 1, type: 'group' } as Dialog)).toEqual([]);
  });
});

describe('图片分组与链接', () => {
  it('按天分组、按列切行，重复图片地址不导致键冲突', () => {
    const rows = pictureRows([
      { msg: msg(4), body: image('a') }, { msg: msg(3), body: image('a') },
      { msg: msg(2), body: image('b') }, { msg: msg(1, '2026-11-11'), body: image('c') },
    ], 2);
    expect(rows.map((row) => [row.day, row.pictures.length])).toEqual([['2026-11-12', 2], ['', 1], ['2026-11-11', 1]]);
    expect(rows.flatMap((row) => row.pictures.map((p) => p.key))).toEqual(['4:0', '3:0', '2:0', '1:0']);
    expect(rows[0].pictures[0].src).toBe('thumb-a');
  });
  it('不把表情和视频放入图片分类', () => {
    expect(pictureRows([{ msg: msg(1), body: { kind: 'rich', blocks: [{ t: 'img', src: 's', width: 1, height: 1, emoticon: true }] } }], 2)).toEqual([]);
  });
  it('从引用、列表和表格取第一条链接', () => {
    const body: MsgBody = { kind: 'rich', blocks: [{ t: 'quote', blocks: [{ t: 'list', items: [{ mark: 'bullet', indent: 0, blocks: [{ t: 'p', runs: [{ text: 'a', href: '/a' }] }] }] }] }, { t: 'table', head: false, rows: [[[{ text: 'b', href: '/b' }]]] }] };
    expect(firstHref(body)).toBe('/a');
    expect(firstHref(image('a'))).toBeUndefined();
  });
});
