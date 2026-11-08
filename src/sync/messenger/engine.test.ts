import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api';
import type { Dialog, Msg } from '../api/dialog';
import type { SocketMessage } from '../ws';
import { createMessenger, type MessengerApi, type MessengerDeps } from './engine';
import { memoryCache, memoryKv } from './testing';

const ME = 1;
const OTHER = 2;

function fakeSocket() {
  const handlers = new Map<string, (m: SocketMessage) => void>();
  let open: ((info: { fd: string; reconnect: boolean }) => void) | undefined;
  return {
    on(type: string, fn: (m: SocketMessage) => void) {
      handlers.set(type, fn);
      return () => handlers.delete(type);
    },
    onOpen(fn: (info: { fd: string; reconnect: boolean }) => void) {
      open = fn;
      return () => (open = undefined);
    },
    push(mode: string, data: unknown, extra: Record<string, unknown> = {}) {
      handlers.get('dialog')?.({ type: 'dialog', mode, data, ...extra });
    },
    reconnect() {
      open?.({ fd: 'x', reconnect: true });
    },
  };
}

function dialog(id: number, extra: Partial<Dialog> = {}): Dialog {
  return { id, type: 'user', name: `d${id}`, last_at: '2026-11-08 10:00:00', user_at: '2026-11-08 10:00:00.000', user_ms: 1000, unread: 0, ...extra };
}

function msg(id: number, extra: Partial<Msg> = {}): Msg {
  return { id, dialog_id: 10, userid: OTHER, type: 'text', msg: { text: `m${id}` }, created_at: '2026-11-08 10:00:00', read_at: null, ...extra };
}

/** 服务端一页消息：倒序，两端带 prev_id / next_id */
function page(ids: number[], prev: number, next = 0, extra: Partial<Msg> = {}): Msg[] {
  const list = ids.sort((a, b) => b - a).map((id) => msg(id, extra));
  list[0] = { ...list[0]!, next_id: next };
  list[list.length - 1] = { ...list[list.length - 1]!, prev_id: prev };
  return list;
}

function fakeApi(over: Partial<MessengerApi> = {}): MessengerApi {
  return {
    lists: vi.fn(async () => ({ current_page: 1, last_page: 1, data: [] })),
    beyond: vi.fn(async () => []),
    one: vi.fn(async (id: number) => dialog(id)),
    msgList: vi.fn(async () => ({ list: [], time: 0 })),
    msgLatest: vi.fn(async () => []),
    msgRead: vi.fn(async () => []),
    msgUnread: vi.fn(async (id: number) => ({ id, unread: 0, unread_one: 0, mention: 0, mention_ids: [], user_at: '2026-11-08 10:00:01.000', user_ms: 2000 })),
    msgMark: vi.fn(),
    msgDot: vi.fn(async () => {}),
    top: vi.fn(),
    hide: vi.fn(async () => {}),
    silence: vi.fn(),
    color: vi.fn(),
    sendText: vi.fn(),
    ...over,
  } as MessengerApi;
}

let clock = Date.parse('2026-11-08T10:00:00');

function setup(api: MessengerApi, extra: Partial<MessengerDeps> = {}) {
  const socket = fakeSocket();
  const kv = memoryKv();
  const cache = memoryCache();
  const m = createMessenger({ api, socket, cache, kv, userId: ME, now: () => clock, ...extra });
  return { m, socket, kv, cache, s: () => m.store.getState() };
}

/** 让排队的微任务和到期的定时器都跑完 */
async function settle(ms = 1000) {
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  clock = Date.parse('2026-11-08T10:00:00');
});
afterEach(() => {
  vi.useRealTimers();
});

describe('会话列表同步', () => {
  it('首次全量分页取完，记下最大 user_at；再次同步带 timerange 并删掉服务端已删的会话', async () => {
    const lists = vi.fn(async ({ page }: { page: number; timerange?: string }) =>
      page === 1
        ? { current_page: 1, last_page: 2, data: [dialog(10, { user_at: '2026-11-08 09:00:00.100' }), dialog(11)] }
        : { current_page: 2, last_page: 2, data: [dialog(12, { user_at: '2026-11-08 11:00:00.000' })] },
    );
    const { m, kv, cache, s } = setup(fakeApi({ lists }));
    await m.start();
    await settle();
    expect(Object.keys(s().dialogs)).toEqual(['10', '11', '12']);
    expect(s().synced).toBe(true);
    expect(lists.mock.calls[0]![0]).toMatchObject({ page: 1, timerange: undefined });
    expect(JSON.parse(kv.map.get('sync')!).updated).toBe('2026-11-08 11:00:00.000');
    expect(cache.data.dialogs.size).toBe(3);

    lists.mockImplementation(async () => ({ current_page: 1, last_page: 1, data: [], deleted_id: [11] }));
    await m.syncDialogs();
    await settle();
    expect(lists.mock.lastCall![0].timerange).toMatch(/^2026-11-08 11:00:00\.000,\d+$/);
    expect(s().dialogs[11]).toBeUndefined();
    expect(cache.data.dialogs.has(11)).toBe(false);
    m.stop();
  });

  it('冷启动先从缓存画出列表', async () => {
    let release!: () => void;
    const lists = vi.fn(() => new Promise<never>((resolve) => (release = () => resolve({ current_page: 1, last_page: 1, data: [] } as never))));
    const { m, cache, s } = setup(fakeApi({ lists }));
    await cache.put('dialogs', dialog(10));
    await m.start();
    expect(s().ready).toBe(true);
    expect(s().dialogs[10]?.name).toBe('d10');
    expect(s().synced).toBe(false);
    release();
    m.stop();
  });
});

describe('推送', () => {
  async function started(api = fakeApi()) {
    const ctx = setup(api);
    (api.lists as ReturnType<typeof vi.fn>).mockResolvedValue({ current_page: 1, last_page: 1, data: [dialog(10, { hide: 1 })] });
    await ctx.m.start();
    await settle();
    return ctx;
  }

  it('别人的新消息：未读 +1、@ +1、更新最后消息、取消隐藏、通知监听者', async () => {
    const { m, socket, s } = await started();
    const incoming = vi.fn();
    m.onIncoming(incoming);
    socket.push('add', { ...msg(100, { mention: 1 }), user_at: '2026-11-08 10:00:05.000', user_ms: 5000 }, { silence: 0 });
    expect(s().dialogs[10]).toMatchObject({ unread: 1, mention: 1, hide: 0, last_msg: { id: 100 }, user_ms: 5000 });
    expect(incoming).toHaveBeenCalledWith({ msg: expect.objectContaining({ id: 100 }), silence: false });
    m.stop();
  });

  it('正在看的会话来了新消息不加未读，消息直接进窗口', async () => {
    const api = fakeApi({ msgList: vi.fn(async () => ({ list: page([90], 0), time: 1 })) });
    const { m, socket, s } = await started(api);
    await m.openDialog(10);
    socket.push('add', msg(100));
    expect(s().dialogs[10]).toMatchObject({ unread: 0, last_msg: { id: 100 } });
    expect(s().windows[10]!.list[0]!.id).toBe(100);
    m.stop();
  });

  it('本地没有的会话来了消息就去取会话', async () => {
    const api = fakeApi();
    const { m, socket, s } = await started(api);
    socket.push('add', msg(200, { dialog_id: 99 }));
    await settle();
    expect(api.one).toHaveBeenCalledWith(99);
    expect(s().dialogs[99]).toBeDefined();
    m.stop();
  });

  it('退群删除会话；撤回消息更新最后消息', async () => {
    const { m, socket, s } = await started();
    socket.push('delete', { id: 5, dialog_id: 10, last_msg: { id: 4, type: 'text', msg: {}, created_at: '2026-11-08 09:00:00' } });
    expect(s().dialogs[10]).toMatchObject({ last_msg: { id: 4 }, last_at: '2026-11-08 09:00:00' });
    socket.push('groupExit', { id: 10 });
    expect(s().dialogs[10]).toBeUndefined();
    m.stop();
  });
});

describe('消息窗口', () => {
  it('打开会话先出缓存再取最新页；在最新一端时推送追加，关闭后最新消息写回缓存', async () => {
    const api = fakeApi({
      lists: vi.fn(async () => ({ current_page: 1, last_page: 1, data: [dialog(10, { last_msg: { id: 60, type: 'text', msg: {} } })] })),
      msgList: vi.fn(async () => ({ list: page([58, 59, 60], 57), time: 1 })),
    });
    const { m, socket, cache, s } = setup(api);
    await cache.put('messages', msg(50));
    await m.start();
    await settle();

    const seen: number[][] = [];
    m.store.subscribe((st) => {
      const ids = st.windows[10]?.list.map((x) => x.id);
      if (ids?.length && ids.join() !== seen.at(-1)?.join()) seen.push(ids);
    });
    await m.openDialog(10);
    expect(seen[0]).toEqual([50]);
    expect(s().windows[10]!.list.map((x) => x.id)).toEqual([60, 59, 58]);
    expect(s().windows[10]!.synced).toBe(true);

    socket.push('add', msg(61));
    expect(s().windows[10]!.list[0]!.id).toBe(61);

    m.closeDialog(10);
    await settle();
    expect([...cache.data.messages.keys()].sort()).toEqual([58, 59, 60, 61]);
    expect(s().dialogs[10]!.cached_msg_id).toBe(61);
    m.stop();
  });

  it('往前翻用最旧一条的 prev_id，到头后不再请求', async () => {
    const msgList = vi.fn(async ({ prev_id }: { prev_id?: number }) =>
      prev_id ? { list: page([1, 2], 0), time: 1 } : { list: page([3, 4], 2), time: 1 },
    );
    const api = fakeApi({ msgList });
    const { m, s } = setup(api);
    await m.start();
    await m.openDialog(10);
    await m.loadEarlier(10);
    expect(msgList.mock.lastCall![0]).toMatchObject({ prev_id: 2 });
    expect(s().windows[10]!.list.map((x) => x.id)).toEqual([4, 3, 2, 1]);
    await m.loadEarlier(10);
    expect(msgList).toHaveBeenCalledTimes(2);
    m.stop();
  });
});

describe('已读上报', () => {
  it('合并成一批上报；第一条未读带会话 id 批量标记', async () => {
    const msgRead = vi.fn(async () => []);
    const api = fakeApi({
      msgRead,
      lists: vi.fn(async () => ({ current_page: 1, last_page: 1, data: [dialog(10, { unread: 3, unread_one: 7 })] })),
      msgList: vi.fn(async () => ({ list: page([7, 8, 9], 0), time: 1 })),
    });
    const { m, s } = setup(api);
    await m.start();
    await settle();
    await m.openDialog(10);
    const list = s().windows[10]!.list;
    m.markRead(list.find((x) => x.id === 7)!);
    m.markRead(list.find((x) => x.id === 8)!);
    await settle(100);
    expect(msgRead).toHaveBeenCalledTimes(1);
    expect(msgRead).toHaveBeenCalledWith({ 7: 10, 8: 0 });
    expect(s().windows[10]!.list.every((x) => x.read_at)).toBe(true);
    m.stop();
  });

  it('上报失败撤回本地已读并放回队列', async () => {
    const msgRead = vi.fn().mockRejectedValueOnce(new ApiError('network', 0, '', null)).mockResolvedValue([]);
    const api = fakeApi({ msgRead, msgList: vi.fn(async () => ({ list: page([7], 0), time: 1 })) });
    const { m, s } = setup(api);
    await m.start();
    await m.openDialog(10);
    m.markRead(s().windows[10]!.list[0]!);
    await settle(100);
    expect(s().windows[10]!.list[0]!.read_at).toBeNull();
    m.catchUp();
    await settle(100);
    expect(msgRead).toHaveBeenCalledTimes(2);
    m.stop();
  });
});

describe('发送队列', () => {
  it('断网时整个队列等待，30 秒后按顺序重发', async () => {
    const sendText = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('network', 0, '', null))
      .mockImplementation(async ({ text }: { text: string }) => msg(text === 'a' ? 300 : 301, { userid: ME, read_at: null }));
    const { m, kv, s } = setup(fakeApi({ sendText }));
    await m.start();
    m.sendText({ dialog_id: 10, text: 'a' });
    m.sendText({ dialog_id: 10, text: 'b' });
    await settle(100);
    expect(s().outbox.map((i) => i.state)).toEqual(['sending', 'sending']);
    expect(JSON.parse(kv.map.get('outbox')!)).toHaveLength(2);
    await settle(30_000);
    expect(sendText.mock.calls.map((c) => c[0].text)).toEqual(['a', 'a', 'b']);
    expect(s().outbox).toEqual([]);
    m.stop();
  });

  it('服务端拒绝的标失败，不挡后面的；可以重发或删除', async () => {
    const sendText = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('server', 0, '没有权限', null))
      .mockImplementation(async () => msg(302, { userid: ME }));
    const { m, s } = setup(fakeApi({ sendText }));
    await m.start();
    const a = m.sendText({ dialog_id: 10, text: 'a' });
    m.sendText({ dialog_id: 10, text: 'b' });
    await settle(100);
    expect(s().outbox).toMatchObject([{ localId: a, state: 'failed', error: '没有权限' }]);
    m.retrySend(a);
    await settle(100);
    expect(s().outbox).toEqual([]);
    m.stop();
  });

  it('排队超过 24 小时的标失败', async () => {
    const sendText = vi.fn();
    const { m, kv, s } = setup(fakeApi({ sendText }));
    kv.set('outbox', JSON.stringify([{ localId: 'x', dialog_id: 10, text: 'a', queuedAt: clock - 25 * 3600_000, state: 'sending' }]));
    await m.start();
    await settle(100);
    expect(s().outbox[0]!.state).toBe('failed');
    expect(sendText).not.toHaveBeenCalled();
    m.stop();
  });
});

describe('重连', () => {
  it('增量同步并把打开中的会话补到最新，其它窗口标为未对齐', async () => {
    const msgList = vi.fn(async ({ dialog_id }: { dialog_id: number }) => ({ list: page([1, 2].map((x) => x + dialog_id * 10), 0), time: 1 }));
    const api = fakeApi({ msgList });
    const { m, socket, s } = setup(api);
    await m.start();
    await m.openDialog(10);
    m.closeDialog(10);
    await m.openDialog(11);
    msgList.mockClear();
    socket.reconnect();
    await settle();
    expect(api.lists).toHaveBeenCalledTimes(2);
    expect(msgList).toHaveBeenCalledTimes(1);
    expect(msgList.mock.calls[0]![0]).toMatchObject({ dialog_id: 11 });
    expect(s().windows[10]!.synced).toBe(false);
    m.stop();
  });
});
