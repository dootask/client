import { describe, expect, it } from 'vitest';

import type { Msg } from '../../../sync/api/dialog';
import type { OutboxItem, WithdrawnMsg } from '../../../sync/messenger';
import { buildRows, chained, msgRow, SYSTEM_AUTHOR } from './chatModel';

const ME = 1;
const msg = (id: number, patch: Partial<Msg> = {}): Msg => ({ id, dialog_id: 10, userid: 2, type: 'text', msg: {}, created_at: '2026-11-08 10:00:00', ...patch });
const pending = (localId: string, dialog_id = 10): OutboxItem => ({ localId, dialog_id, text: 'x', queuedAt: 1, state: 'sending' });
const hole = (id: number): WithdrawnMsg => ({ id, dialog_id: 10, text: 'x', md: false, created_at: '2026-11-08 10:00:00', at: 1 });
const base = { outbox: [], withdrawn: [], sentKeys: {}, dialogId: 10, userId: ME };

describe('聊天列表的行', () => {
  it('窗口在最新一端：发送中的排最前，新的在前', () => {
    const rows = buildRows({ ...base, list: [msg(5), msg(4)], outbox: [pending('a'), pending('b', 11), pending('c')] });
    expect(rows.map((r) => r.id)).toEqual(['c', 'a', '5', '4']);
    expect(rows[0]!.authorId).toBe('1');
  });

  it('窗口不在最新一端时不显示发送中的', () => {
    const rows = buildRows({ ...base, list: [msg(5, { next_id: 9 }), msg(4)], outbox: [pending('a')] });
    expect(rows.map((r) => r.id)).toEqual(['5', '4']);
  });

  it('撤回占位插回原位置，窗口外的不放', () => {
    const withdrawn = [hole(6), hole(3), hole(1), { ...hole(4), dialog_id: 11 }];
    expect(buildRows({ ...base, list: [msg(5), msg(2)], withdrawn }).map((r) => r.id)).toEqual(['6', '5', '3', '2']);
    expect(buildRows({ ...base, list: [msg(5, { next_id: 9 }), msg(2)], withdrawn }).map((r) => r.id)).toEqual(['5', '3', '2']);
  });

  it('原消息还在（撤回请求未返回）时不重复画占位', () => {
    expect(buildRows({ ...base, list: [msg(5), msg(2)], withdrawn: [hole(5)] }).map((r) => r.id)).toEqual(['5', '2']);
  });

  it('发出的消息沿用本地键', () => {
    const rows = buildRows({ ...base, list: [msg(5)], sentKeys: { 5: 'local-1' } });
    expect(rows[0]!.key).toBe('local-1');
  });

  it('系统消息不算任何人发的', () => {
    expect(msgRow(msg(5, { type: 'tag' })).authorId).toBe(SYSTEM_AUTHOR);
  });
});

describe('连成一组', () => {
  it('同一人 3 分钟内连成一组，超过或换人不连', () => {
    const a = msgRow(msg(1, { created_at: '2026-11-08 10:00:00' }));
    expect(chained(a, msgRow(msg(2, { created_at: '2026-11-08 10:03:00' })))).toBe(true);
    expect(chained(a, msgRow(msg(2, { created_at: '2026-11-08 10:03:01' })))).toBe(false);
    expect(chained(a, msgRow(msg(2, { userid: 3 })))).toBe(false);
  });

  it('系统消息不连', () => {
    expect(chained(msgRow(msg(1, { type: 'tag' })), msgRow(msg(2, { type: 'top' })))).toBe(false);
  });
});
