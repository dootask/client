import { describe, expect, it } from 'vitest';

import type { StoredDialog } from '../../sync/messenger';
import { extraResults, listedIds, listTime, nextUnreadId } from './listModel';

const d = (id: number, patch: Partial<StoredDialog> = {}): StoredDialog => ({ id, type: 'group', name: `g${id}`, last_at: `2026-11-0${id % 9 || 1} 10:00:00`, ...patch });
const map = (...list: StoredDialog[]) => Object.fromEntries(list.map((x) => [x.id, x]));
const input = (dialogs: Record<number, StoredDialog>, drafts: Record<number, string> = {}) => ({ dialogs, drafts, openId: 0, aiHidden: false, now: Date.UTC(2026, 10, 8) / 1000 });

describe('会话列表', () => {
  it('按分类过滤并排序：置顶、待办、草稿、时间', () => {
    const dialogs = map(
      d(1),
      d(2, { top_at: '2026-11-01 00:00:00' }),
      d(3, { todo_num: 1 }),
      d(4, { type: 'user', bot: 1 }),
      d(5, { group_type: 'project' }),
      d(6),
    );
    expect(listedIds(input(dialogs, { 1: '<p>草稿</p>', 6: '<p></p>' }), '', '')).toEqual([2, 3, 1, 6, 5, 4]);
    expect(listedIds(input(dialogs), 'project', '')).toEqual([5]);
    expect(listedIds(input(dialogs), 'bot', '')).toEqual([4]);
  });

  it('搜索匹配名称、拼音、最后消息，忽略分类', () => {
    const dialogs = map(d(1, { name: '设计组', pinyin: 'shejizu' }), d(2, { last_msg: { id: 9, type: 'text', msg: { text: '<p>周会改到下午</p>' } } }), d(3));
    expect(listedIds(input(dialogs), 'project', 'sheji')).toEqual([1]);
    expect(listedIds(input(dialogs), '', '周会')).toEqual([2]);
  });

  it('服务端搜索结果去掉本地已有的', () => {
    const local = [d(1, { last_msg: { id: 9, type: 'text', msg: {} } }), d(2, { type: 'user', dialog_user: { userid: 7 } })];
    const remote = [
      { ...d(1), last_msg: { id: 9, type: 'text', msg: {} } },
      { ...d(1), last_msg: { id: 10, type: 'text', msg: {} }, search_msg_id: 10 },
      { id: 'u:7', type: 'user', name: 'x', dialog_user: { userid: 7 } },
      { id: 'u:8', type: 'user', name: 'y', dialog_user: { userid: 8 } },
    ];
    expect(extraResults(local, remote, false).map((x) => x.id)).toEqual([1, 'u:8']);
  });

  it('时间：今天、昨天、今年、更早', () => {
    const now = new Date(2026, 10, 8, 12).getTime();
    expect(listTime('2026-11-08 00:05:00', now)?.kind).toBe('today');
    expect(listTime('2026-11-07 23:59:00', now)?.kind).toBe('yesterday');
    expect(listTime('2026-01-01 08:00:00', now)?.kind).toBe('thisYear');
    expect(listTime('2025-12-31 08:00:00', now)?.kind).toBe('older');
    expect(listTime(null, now)).toBeNull();
  });

  it('未读跳转：从当前之后找，先未读、再待办、再免打扰未读，到尾回头', () => {
    const dialogs = map(d(1, { unread: 2 }), d(2, { todo_num: 1 }), d(3, { unread: 1, silence: 1 }), d(4, { mention: 1 }));
    expect(nextUnreadId([1, 2, 3, 4], dialogs, 0)).toBe(1);
    expect(nextUnreadId([1, 2, 3, 4], dialogs, 1)).toBe(4);
    expect(nextUnreadId([1, 2, 3, 4], dialogs, 4)).toBe(1);
    expect(nextUnreadId([2, 3], dialogs, 0)).toBe(2);
    expect(nextUnreadId([3], dialogs, 0)).toBe(3);
    expect(nextUnreadId([], dialogs, 0)).toBe(0);
  });
});
