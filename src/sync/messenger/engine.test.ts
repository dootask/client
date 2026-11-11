import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api';
import type { Dialog, Msg } from '../api/dialog';
import type { SocketMessage } from '../ws';
import { createMsgActions, type MsgActionsApi } from './actions';
import { createMessenger, type MessengerApi, type MessengerDeps, toggledEmoji } from './engine';
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
    withdraw: vi.fn(async () => {}),
    emoji: vi.fn(),
    myTodos: vi.fn(async () => []),
    sendFile: vi.fn(),
    sendRecord: vi.fn(),
    convertRecord: vi.fn(),
    forgetFile: vi.fn(),
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
    expect(s().dialogs[10]).toMatchObject({ unread: 1, mention: 1, mention_ids: [100], unread_one: 100, hide: 0, last_msg: { id: 100 }, user_ms: 5000 });
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

  it('打开期间来过新消息：关闭时先报已读，再取服务端未读（没看到的不能丢）', async () => {
    const msgUnread = vi.fn(async (id: number) => ({ id, unread: 3, unread_one: 100, mention: 0, mention_ids: [], user_at: '2026-11-08 10:00:01.000', user_ms: 2000 }));
    const api = fakeApi({ msgList: vi.fn(async () => ({ list: page([90], 0), time: 1 })), msgUnread });
    const { m, socket, s } = await started(api);
    await m.openDialog(10);
    m.markRead(msg(90));
    socket.push('add', msg(100));
    m.closeDialog(10);
    await settle(0);
    expect(api.msgRead).toHaveBeenCalled();
    expect(msgUnread).toHaveBeenCalledWith(10);
    expect(s().dialogs[10]).toMatchObject({ unread: 3, unread_one: 100 });

    // 没来新消息的会话关闭时不多发请求
    msgUnread.mockClear();
    await m.openDialog(10);
    m.closeDialog(10);
    await settle(0);
    expect(msgUnread).not.toHaveBeenCalled();
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
    expect(Object.keys(s().sentKeys)).toEqual(['300', '301']);
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

describe('发文件', () => {
  const file = (name: string) => ({ uri: `file:///${name}`, name, size: 100, mimeType: 'image/png' });

  it('同一会话按顺序一个一个传，不同会话同时最多两个；进度单独记录，成功后换成发出的消息', async () => {
    const pending: ((v: unknown) => void)[] = [];
    let onProgress: ((ratio: number) => void) | undefined;
    const sendFile = vi.fn(
      (p: { dialogId: number; onProgress: (r: number) => void }) =>
        new Promise((resolve) => {
          onProgress ??= p.onProgress;
          pending.push(resolve);
        }),
    );
    const { m, s } = setup(fakeApi({ sendFile }));
    await m.start();
    m.sendFiles({ dialog_id: 10, files: [file('a'), file('b')], reply_id: 5 });
    m.sendFiles({ dialog_id: 11, files: [file('c')] });
    m.sendFiles({ dialog_id: 12, files: [file('d')] });
    await settle(10);
    expect(sendFile).toHaveBeenCalledTimes(2);
    expect(sendFile.mock.calls.map((call) => call[0].dialogId)).toEqual([10, 11]);
    expect(sendFile.mock.calls[0]![0]).toMatchObject({ replyId: 5 });
    const [a] = s().uploads;
    onProgress!(0.5);
    expect(m.uploadProgress.getState()[a!.localId]).toBe(0.5);
    pending[0]!(msg(400, { userid: ME, type: 'file' }));
    await settle(10);
    expect(sendFile).toHaveBeenCalledTimes(3);
    expect(sendFile.mock.calls[2]![0]).toMatchObject({ dialogId: 10, file: { name: 'b' } });
    expect(s().uploads).toHaveLength(3);
    expect(s().sentKeys[400]).toBe(a!.localId);
    expect(m.uploadProgress.getState()[a!.localId]).toBeUndefined();
    m.stop();
  });

  it('失败的标失败等重发；取消时中止上传并清掉服务端会话', async () => {
    let signal: AbortSignal | undefined;
    const sendFile = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('server', 0, '文件太大', null))
      .mockImplementation((p: { signal: AbortSignal }) => {
        signal = p.signal;
        return new Promise(() => {});
      });
    const forgetFile = vi.fn();
    const { m, s } = setup(fakeApi({ sendFile, forgetFile }));
    await m.start();
    m.sendFiles({ dialog_id: 10, files: [file('a')] });
    await settle(10);
    const [a] = s().uploads;
    expect(a).toMatchObject({ state: 'failed', error: '文件太大' });
    m.retryUpload(a!.localId);
    await settle(10);
    expect(s().uploads[0]!.state).toBe('sending');
    m.discardUpload(a!.localId);
    expect(signal!.aborted).toBe(true);
    expect(s().uploads).toEqual([]);
    expect(forgetFile).toHaveBeenCalledWith(a!.localId, a!.file);
    m.stop();
  });

  it('语音走同一个队列：排在同一会话的文件之后，用语音接口发出', async () => {
    let finishFile: ((v: unknown) => void) | undefined;
    const sendFile = vi.fn(() => new Promise((resolve) => (finishFile = resolve)));
    const sendRecord = vi.fn(async () => msg(401, { userid: ME, type: 'record' }));
    const { m, s } = setup(fakeApi({ sendFile, sendRecord }));
    await m.start();
    m.sendFiles({ dialog_id: 10, files: [file('a')] });
    m.sendRecord({ dialog_id: 10, file: file('r.m4a'), duration: 1500, reply_id: 5 });
    await settle(10);
    expect(sendRecord).not.toHaveBeenCalled();
    finishFile!(msg(400, { userid: ME, type: 'file' }));
    await settle(10);
    expect(sendRecord).toHaveBeenCalledWith({ dialog_id: 10, file: file('r.m4a'), duration: 1500, reply_id: 5 });
    expect(s().uploads).toEqual([]);
    expect(Object.keys(s().sentKeys)).toEqual(['400', '401']);
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

describe('编辑、撤回、表情回应', () => {
  async function opened(api: MessengerApi) {
    const ctx = setup(api);
    await ctx.m.start();
    await ctx.m.openDialog(10);
    return ctx;
  }

  it('只带部分字段的更新推送按 id 合并', async () => {
    const { m, socket, s } = await opened(fakeApi({ msgList: vi.fn(async () => ({ list: page([1, 2], 0), time: 1 })) }));
    socket.push('update', { id: 2, emoji: [{ symbol: '👍', userids: [OTHER] }] });
    expect(s().windows[10]!.list[0]).toMatchObject({ id: 2, msg: { text: 'm2' }, emoji: [{ symbol: '👍', userids: [OTHER] }] });
    m.stop();
  });

  it('表情回应先在本地切换，失败时还原', async () => {
    const emoji = vi.fn().mockRejectedValueOnce(new Error('x'));
    const { m, s } = await opened(fakeApi({ emoji, msgList: vi.fn(async () => ({ list: page([1], 0, 0, { emoji: [{ symbol: '👍', userids: [OTHER] }] } as never), time: 1 })) }));
    const target = s().windows[10]!.list[0]!;
    const pending = m.toggleEmoji(target, '👍');
    expect((s().windows[10]!.list[0] as never as { emoji: unknown }).emoji).toEqual([{ symbol: '👍', userids: [ME, OTHER] }]);
    await expect(pending).rejects.toThrow('x');
    expect((s().windows[10]!.list[0] as never as { emoji: unknown }).emoji).toEqual([{ symbol: '👍', userids: [OTHER] }]);
    m.stop();
  });

  it('撤回文本：记下原文，5 分钟后过期', async () => {
    const { m, s } = await opened(fakeApi({ msgList: vi.fn(async () => ({ list: page([1, 2], 0, 0, { userid: ME, msg: { text: '<p>原文</p>' } }), time: 1 })) }));
    await m.withdraw(s().windows[10]!.list[0]!);
    expect(s().windows[10]!.list.map((x) => x.id)).toEqual([1]);
    expect(s().withdrawn).toEqual([{ id: 2, dialog_id: 10, text: '<p>原文</p>', md: false, created_at: '2026-11-08 10:00:00', at: clock }]);
    await settle(5 * 60_000);
    expect(s().withdrawn).toEqual([]);
    m.stop();
  });

  it('撤回失败且消息还在时去掉占位', async () => {
    const { m, s } = await opened(fakeApi({ withdraw: vi.fn().mockRejectedValue(new Error('超时')), msgList: vi.fn(async () => ({ list: page([1], 0, 0, { userid: ME }), time: 1 })) }));
    await expect(m.withdraw(s().windows[10]!.list[0]!)).rejects.toThrow('超时');
    expect(s().withdrawn).toEqual([]);
    m.stop();
  });

  it('编辑后替换原消息', async () => {
    const sendText = vi.fn(async () => msg(1, { msg: { text: '新' }, modify: 1 } as never));
    const { m, s } = await opened(fakeApi({ sendText, msgList: vi.fn(async () => ({ list: page([1], 0), time: 1 })) }));
    await m.editText({ dialog_id: 10, update_id: 1, text: '新' });
    expect(sendText).toHaveBeenCalledWith({ dialog_id: 10, update_id: 1, text: '新' });
    expect(s().windows[10]!.list[0]).toMatchObject({ id: 1, msg: { text: '新' }, modify: 1 });
    m.stop();
  });
});

describe('分类筛选', () => {
  /** 窗口：1–6，其中 2、5 是标注；按 tag 筛选时服务端返回 5，更早还有 2 */
  function api() {
    const msgList = vi.fn(async ({ msg_type, prev_id }: { msg_type?: string; prev_id?: number }) => {
      if (!msg_type) return { list: [6, 5, 4, 3, 2, 1].map((id) => msg(id, { tag: id === 2 || id === 5 ? ME : 0 })), time: 1 };
      if (prev_id) return { list: [msg(2, { tag: ME, prev_id: 0 })], time: 1 };
      return { list: [msg(5, { tag: ME, next_id: 0, prev_id: 2 })], time: 1 };
    });
    return { msgList, api: fakeApi({ msgList }) };
  }

  async function filtered() {
    const { msgList, api: a } = api();
    const ctx = setup(a);
    await ctx.m.start();
    await ctx.m.openDialog(10);
    await ctx.m.setFilter(10, 'tag');
    return { ...ctx, msgList };
  }

  const ids = (list: Msg[]) => list.map((x) => x.id);

  it('按分类取一页，往前翻用最旧一条的 prev_id', async () => {
    const { m, s, msgList } = await filtered();
    expect(msgList.mock.lastCall![0]).toMatchObject({ dialog_id: 10, msg_type: 'tag' });
    expect(ids(s().filter!.list)).toEqual([5]);
    await m.loadFilterEarlier();
    expect(msgList.mock.lastCall![0]).toMatchObject({ msg_type: 'tag', prev_id: 4 });
    expect(ids(s().filter!.list)).toEqual([5, 2]);
    await m.loadFilterEarlier();
    expect(msgList).toHaveBeenCalledTimes(3);
    m.stop();
  });

  it('新来的同类消息加进来，别的不加', async () => {
    const { m, socket, s } = await filtered();
    socket.push('add', msg(7));
    socket.push('add', msg(8, { tag: OTHER }));
    expect(ids(s().filter!.list)).toEqual([8, 5]);
    m.stop();
  });

  it('取消标注的去掉；已取到范围外的新标注等往前翻时再来', async () => {
    const { m, socket, s, msgList } = await filtered();
    socket.push('update', { id: 5, tag: 0 });
    socket.push('update', { id: 3, tag: ME });
    expect(ids(s().filter!.list)).toEqual([]);
    await m.loadFilterEarlier();
    expect(msgList.mock.lastCall![0]).toMatchObject({ prev_id: 4 });
    m.stop();
  });

  it('撤回、删除同步去掉；已读同步过来；关闭会话清掉筛选', async () => {
    const { m, socket, s } = await filtered();
    m.markRead(s().filter!.list[0]!);
    expect(s().filter!.list[0]!.read_at).toBeTruthy();
    socket.push('delete', { dialog_id: 10, id: 5 });
    expect(s().filter!.list).toEqual([]);
    m.closeDialog(10);
    expect(s().filter).toBeNull();
    m.stop();
  });

  it('换分类时旧请求晚回来不覆盖', async () => {
    let release: () => void = () => {};
    const msgList = vi.fn(async ({ msg_type }: { msg_type?: string }) => {
      if (msg_type === 'tag') await new Promise<void>((r) => (release = r));
      return { list: msg_type ? [msg(msg_type === 'tag' ? 5 : 3, { prev_id: 0 })] : [], time: 1 };
    });
    const { m, s } = setup(fakeApi({ msgList }));
    await m.start();
    await m.openDialog(10);
    const slow = m.setFilter(10, 'tag');
    await m.setFilter(10, 'image');
    release();
    await slow;
    expect(s().filter).toMatchObject({ type: 'image', list: [{ id: 3 }] });
    m.stop();
  });
});

it('表情切换规则与服务端一致', () => {
  expect(toggledEmoji([], 'a', 1)).toEqual([{ symbol: 'a', userids: [1] }]);
  expect(toggledEmoji([{ symbol: 'a', userids: [2] }], 'a', 1)).toEqual([{ symbol: 'a', userids: [1, 2] }]);
  expect(toggledEmoji([{ symbol: 'a', userids: [1] }, { symbol: 'b', userids: [2] }], 'a', 1)).toEqual([{ symbol: 'b', userids: [2] }]);
});

describe('消息操作', () => {
  async function opened(over: Partial<MsgActionsApi> = {}, engine: Partial<MessengerApi> = {}) {
    const api = fakeApi({ msgList: vi.fn(async () => ({ list: page([90, 91], 0), time: 1 })), ...engine });
    (api.lists as ReturnType<typeof vi.fn>).mockResolvedValue({ current_page: 1, last_page: 1, data: [dialog(10), dialog(20)] });
    const ctx = setup(api);
    await ctx.m.start();
    await settle();
    await ctx.m.openDialog(10);
    const actionsApi = {
      msgTop: vi.fn(),
      msgTag: vi.fn(),
      msgTodo: vi.fn(),
      forward: vi.fn(),
      msgTranslation: vi.fn(),
      msgVoice2text: vi.fn(),
      msgTopInfo: vi.fn(),
      msgReadList: vi.fn(),
      favoriteCheck: vi.fn(),
      favoriteToggle: vi.fn(),
      favoriteRemark: vi.fn(),
      ...over,
    } as MsgActionsApi;
    return { ...ctx, actions: createMsgActions(actionsApi, ctx.m) };
  }
  const listIds = (s: () => ReturnType<ReturnType<typeof createMessenger>['store']['getState']>) => s().windows[10]!.list.map((x) => x.id);

  it('置顶：会话记下置顶消息，系统提示插进窗口；取消置顶清空', async () => {
    const msgTop = vi.fn(async () => ({ data: { add: msg(92, { type: 'top' }), update: { dialog_id: 10, top_msg_id: 90, top_userid: ME } }, msg: '' }));
    const { m, s, actions } = await opened({ msgTop });
    expect(await actions.toggleTop(msg(90))).toBe(true);
    expect(s().dialogs[10]).toMatchObject({ top_msg_id: 90, top_userid: ME, last_msg: { id: 92 } });
    expect(listIds(s)[0]).toBe(92);
    msgTop.mockResolvedValueOnce({ data: { add: msg(93, { type: 'top' }), update: { dialog_id: 10, top_msg_id: 0, top_userid: 0 } }, msg: '' });
    expect(await actions.toggleTop(msg(90))).toBe(false);
    expect(s().dialogs[10]).toMatchObject({ top_msg_id: 0 });
    m.stop();
  });

  it('标注合并 update，返回标注后的状态', async () => {
    const msgTag = vi.fn(async () => ({ data: { update: { id: 90, dialog_id: 10, tag: ME } }, msg: '' }));
    const { m, s, actions } = await opened({ msgTag });
    expect(await actions.toggleTag(msg(90))).toBe(true);
    expect(s().windows[10]!.list.find((x) => x.id === 90)).toMatchObject({ tag: ME, msg: { text: 'm90' } });
    m.stop();
  });

  it('待办变化后按服务端刷新会话的待办数（设待办的 update 带 todo；完成不带，单独刷新）', async () => {
    const msgTodo = vi.fn(async () => ({ data: { update: { id: 90, dialog_id: 10, todo: ME } }, msg: '设置成功' }));
    const msgDone = vi.fn(async () => ({ data: {}, msg: '已完成' }));
    const myTodos = vi.fn(async () => [{ id: 1, msg_id: 90, dialog_id: 10 }]);
    const { m, s, actions } = await opened({ msgTodo, msgDone }, { myTodos });
    expect(await actions.setTodo({ msg_id: 90, type: 'all', userids: [] })).toBe('设置成功');
    await settle();
    expect(myTodos).toHaveBeenCalledWith(10);
    expect(s().dialogs[10]!.todo_num).toBe(1);
    myTodos.mockResolvedValueOnce([]);
    await actions.done(1, 10);
    await settle();
    expect(s().dialogs[10]!.todo_num).toBe(0);
    m.stop();
  });

  it('转发产生的消息插进各目标会话', async () => {
    const forward = vi.fn(async () => ({ msgs: [msg(200, { dialog_id: 20, userid: ME }), msg(201, { dialog_id: 10, userid: ME })], msg: '' }));
    const { m, s, actions } = await opened({ forward });
    await actions.forward({ msg_ids: [90], merge: false, dialogids: [10, 20], userids: [], show_source: true, leave_message: '' });
    expect(s().dialogs[20]!.last_msg).toMatchObject({ id: 200 });
    expect(listIds(s)[0]).toBe(201);
    m.stop();
  });

  it('翻译：期间标记忙，译文只存本地，可隐藏', async () => {
    let finish!: () => void;
    const msgTranslation = vi.fn(
      () => new Promise<{ msg_id: number; language: string; content: string }>((r) => (finish = () => r({ msg_id: 90, language: 'en', content: 'hello' }))),
    );
    const { m, s, actions } = await opened({ msgTranslation });
    const task = actions.translate(msg(90), 'en');
    expect(s().busy[90]).toBe('translate');
    finish();
    await task;
    expect(s().busy[90]).toBeUndefined();
    expect(s().translations[90]).toEqual({ language: 'en', content: 'hello' });
    actions.hideTranslation(90);
    expect(s().translations[90]).toBeUndefined();
    m.stop();
  });

  it('翻译失败也清掉忙标记并抛出', async () => {
    const msgTranslation = vi.fn(async () => {
      throw new ApiError('server', 0, 'fail', null);
    });
    const { m, s, actions } = await opened({ msgTranslation });
    await expect(actions.translate(msg(90), 'en')).rejects.toThrow('fail');
    expect(s().busy[90]).toBeUndefined();
    m.stop();
  });

  it('收藏状态：查过和切换后都记下', async () => {
    const favoriteCheck = vi.fn(async () => true);
    const favoriteToggle = vi.fn(async () => ({ favorited: false, msg: '已取消' }));
    const { m, s, actions } = await opened({ favoriteCheck, favoriteToggle });
    await actions.checkFavorite(90);
    expect(s().favorites[90]).toBe(true);
    expect(await actions.toggleFavorite(90)).toEqual({ favorited: false, msg: '已取消' });
    expect(s().favorites[90]).toBe(false);
    m.stop();
  });

  it('置顶消息：窗口里有就不请求', async () => {
    const msgTopInfo = vi.fn(async () => msg(5));
    const { m, actions } = await opened({ msgTopInfo });
    expect((await actions.topMsg(10, 90))?.id).toBe(90);
    expect(msgTopInfo).not.toHaveBeenCalled();
    expect((await actions.topMsg(10, 5))?.id).toBe(5);
    m.stop();
  });

  it('语音转文字写进消息', async () => {
    const msgVoice2text = vi.fn(async () => msg(91, { type: 'record', msg: { path: 'a.mp3', text: '你好' } }));
    const { m, s, actions } = await opened({ msgVoice2text });
    await actions.voice2text(msg(91, { type: 'record' }));
    expect(s().windows[10]!.list.find((x) => x.id === 91)!.msg).toMatchObject({ text: '你好' });
    m.stop();
  });
});
