import { type ApiClient, ApiError, createUploader, type LocalFile, UploadCancelled, type UploadIO, type UploadParams } from '../api';
import * as dialogApi from '../api/dialog';
import type { Dialog, Msg, MsgListParams, SendTextParams } from '../api/dialog';
import type { StructuredCache } from '../storage/types';
import type { SocketMessage } from '../ws';
import {
  applyAroundPage,
  applyEarlierPage,
  applyLatestPage,
  applyNewerPage,
  atLatest,
  type DialogPatch,
  earlierCursor,
  hasEarlier,
  isAiBotDialog,
  lastMsgPatch,
  matchesFilter,
  mergeDialog,
  type MsgFilterType,
  newerCursor,
  removeMsgs,
  upsertMsgs,
} from './rules';
import { createStore } from 'zustand/vanilla';

import { createMessengerStore, type MessengerState, type MsgSlice, type MsgThread, type MsgWindow, type OutboxItem, type StoredDialog, type UploadItem, type WithdrawnMsg } from './store';

/** 引擎用到的接口，client 已绑定；测试时注入假的 */
export interface MessengerApi {
  lists: (params: Parameters<typeof dialogApi.lists>[1]) => ReturnType<typeof dialogApi.lists>;
  beyond: (params: Parameters<typeof dialogApi.beyond>[1]) => ReturnType<typeof dialogApi.beyond>;
  one: (dialogId: number) => ReturnType<typeof dialogApi.one>;
  openUser: (userid: number) => ReturnType<typeof dialogApi.openUser>;
  msgList: (params: MsgListParams) => ReturnType<typeof dialogApi.msgList>;
  msgOne: (msgId: number) => ReturnType<typeof dialogApi.msgOne>;
  msgLatest: (dialogs: { id: number; latest_id: number }[], take: number) => ReturnType<typeof dialogApi.msgLatest>;
  msgRead: (ids: Record<number, number>) => ReturnType<typeof dialogApi.msgRead>;
  msgUnread: (dialogId: number) => ReturnType<typeof dialogApi.msgUnread>;
  msgMark: (params: Parameters<typeof dialogApi.msgMark>[1]) => ReturnType<typeof dialogApi.msgMark>;
  msgDot: (msgId: number) => Promise<void>;
  top: (dialogId: number) => ReturnType<typeof dialogApi.top>;
  hide: (dialogId: number) => Promise<void>;
  silence: (dialogId: number, on: boolean) => ReturnType<typeof dialogApi.silence>;
  color: (dialogId: number, value: string) => ReturnType<typeof dialogApi.color>;
  sendText: (params: SendTextParams) => ReturnType<typeof dialogApi.sendText>;
  withdraw: (msgId: number) => Promise<void>;
  emoji: (msgId: number, symbol: string) => ReturnType<typeof dialogApi.emoji>;
  myTodos: (dialogId: number) => ReturnType<typeof dialogApi.myTodos>;
  /** 上传并发出文件消息，resolve 服务端返回的消息数据 */
  sendFile: (params: UploadParams) => Promise<unknown>;
  /** 放弃发送的文件：释放本地文件、清掉服务端的分片会话 */
  forgetFile: (key: string, file: LocalFile) => void;
  /** 发出语音，成功后释放本地文件 */
  sendRecord: (params: RecordUpload & { reply_id?: number }) => ReturnType<typeof dialogApi.sendRecord>;
  convertRecord: (params: RecordUpload) => ReturnType<typeof dialogApi.convertRecord>;
}

/** 录好的语音：文件和时长（毫秒） */
export interface RecordUpload {
  dialog_id: number;
  file: LocalFile;
  duration: number;
}

/** io：平台的读文件和上传实现 */
export function bindMessengerApi(client: ApiClient, io: UploadIO): MessengerApi {
  const uploader = createUploader(client, io);
  // 接口收带音频类型的 base64；录音是 AAC（m4a 容器）
  const recordParams = async ({ dialog_id, file, duration }: RecordUpload) => ({ dialog_id, duration, base64: `data:audio/m4a;base64,${await io.base64(file)}` });
  return {
    lists: (p) => dialogApi.lists(client, p),
    beyond: (p) => dialogApi.beyond(client, p),
    one: (id) => dialogApi.one(client, id),
    openUser: (userid) => dialogApi.openUser(client, userid),
    msgList: (p) => dialogApi.msgList(client, p),
    msgOne: (id) => dialogApi.msgOne(client, id),
    msgLatest: (d, take) => dialogApi.msgLatest(client, d, take),
    msgRead: (ids) => dialogApi.msgRead(client, ids),
    msgUnread: (id) => dialogApi.msgUnread(client, id),
    msgMark: (p) => dialogApi.msgMark(client, p),
    msgDot: (id) => dialogApi.msgDot(client, id),
    top: (id) => dialogApi.top(client, id),
    hide: (id) => dialogApi.hide(client, id),
    silence: (id, on) => dialogApi.silence(client, id, on),
    color: (id, v) => dialogApi.color(client, id, v),
    sendText: (p) => dialogApi.sendText(client, p),
    withdraw: (id) => dialogApi.withdraw(client, id),
    emoji: (id, symbol) => dialogApi.emoji(client, id, symbol),
    myTodos: (id) => dialogApi.myTodos(client, id),
    sendFile: (p) => uploader.send(p),
    forgetFile: (key, file) => uploader.forget(key, file),
    sendRecord: async ({ reply_id, ...record }) => {
      const msg = await dialogApi.sendRecord(client, { ...(await recordParams(record)), reply_id });
      io.release(record.file);
      return msg;
    },
    convertRecord: async (record) => {
      try {
        return await dialogApi.convertRecord(client, await recordParams(record));
      } finally {
        io.release(record.file);
      }
    },
  };
}

/** 按账号隔离的小数据存储（键值存储里的 messenger.<userid>.<name>） */
export interface MessengerKv {
  get(name: 'sync' | 'beyond' | 'drafts' | 'outbox' | 'aiModels'): string | undefined;
  set(name: 'sync' | 'beyond' | 'drafts' | 'outbox' | 'aiModels', value: string): void;
  remove(name: 'sync' | 'beyond' | 'drafts' | 'outbox' | 'aiModels'): void;
}

export interface MessengerSocket {
  on(type: string, handler: (msg: SocketMessage) => void): () => void;
  onOpen(fn: (info: { fd: string; reconnect: boolean }) => void): () => void;
}

export interface MessengerDeps {
  api: MessengerApi;
  socket: MessengerSocket;
  /** 结构化缓存（会话、消息集合） */
  cache: StructuredCache;
  kv: MessengerKv;
  /** 当前登录的用户 */
  userId: number;
  now?: () => number;
  log?: (...args: unknown[]) => void;
}

/** 别人发来的新消息（通知、横幅用）。silence 由服务端按免打扰和 @ 算好 */
export interface IncomingMessage {
  msg: Msg;
  silence: boolean;
}

const LIST_PAGE_SIZE = 100;
/** 首次全量同步最多取这么多页（按最后消息时间倒序），更早的未读、待办会话靠 beyond 补 */
const FULL_SYNC_PAGES = 10;
const MSG_PAGE_SIZE = 50;

/** 服务端按条件取的几段消息：分类筛选、回复线程 */
const SLICES = ['filter', 'thread'] as const;
type SliceKey = (typeof SLICES)[number];
/** 每个会话缓存最新的这么多条 */
const CACHE_MSGS = 50;
const LATEST_TAKE = 25;
const MAX_WINDOWS = 30;
const READ_DELAY = 50;
const READ_BATCH = 100;
const OUTBOX_RETRY = 30_000;
const OUTBOX_EXPIRE = 24 * 3600_000;
/** 同时上传几个文件（不同会话之间；同一会话一个一个传） */
const UPLOAD_CONCURRENCY = 2;
/** 进度变化不到这么多不更新界面 */
const PROGRESS_STEP = 0.01;
const BEYOND_INTERVAL = 3600_000;
const PERSIST_DELAY = 300;
/** 撤回的文本在本地保留多久（可以重新编辑） */
const WITHDRAWN_KEEP = 5 * 60_000;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseJson<T>(raw: string | undefined): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** 和服务端 emojiMsg 相同的切换规则：点过的去掉（没人了整项去掉），没点过的加在最前 */
export function toggledEmoji(list: readonly { symbol: string; userids: number[] }[], symbol: string, userId: number) {
  const index = list.findIndex((item) => item.symbol === symbol);
  if (index < 0) return [{ symbol, userids: [userId] }, ...list];
  const item = list[index]!;
  const userids = item.userids.includes(userId) ? item.userids.filter((id) => id !== userId) : [userId, ...item.userids];
  return userids.length ? list.map((it, i) => (i === index ? { symbol, userids } : it)) : list.filter((_, i) => i !== index);
}

function msgOf(value: unknown): Msg | undefined {
  const parsed = dialogApi.msgSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/**
 * 消息数据层：会话列表、消息窗口、推送合并、已读上报、发送队列、草稿。
 * 一个实例对应一个登录账号；换号先 stop 再建新的。状态在 store 里，界面订阅 store。
 */
export function createMessenger(deps: MessengerDeps) {
  const { api, cache, kv, userId } = deps;
  const now = deps.now ?? Date.now;
  const log = deps.log ?? (() => {});
  const store = createMessengerStore();
  const get = store.getState;
  const set = store.setState;

  let stopped = false;
  const unsubs: (() => void)[] = [];
  const incomingListeners = new Set<(e: IncomingMessage) => void>();
  /** 最近打开的会话在前，超出 MAX_WINDOWS 的窗口从内存里丢掉 */
  let windowOrder: number[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();

  function later(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!stopped) fn();
    }, ms);
    timers.add(t);
    return t;
  }

  function cancel(t: ReturnType<typeof setTimeout> | undefined) {
    if (!t) return;
    clearTimeout(t);
    timers.delete(t);
  }

  /** 后台任务出错只记日志：数据层的失败由下次同步补上 */
  function background(task: Promise<unknown>, what: string) {
    task.catch((err) => log(`[messenger] ${what} failed`, err));
  }

  // ---------------------------------------------------------------------------
  // 会话
  // ---------------------------------------------------------------------------

  const dirtyDialogs = new Set<number>();
  let dialogTimer: ReturnType<typeof setTimeout> | undefined;

  function isReadLocal(dialogId: number, msgId: number) {
    return !!get().windows[dialogId]?.list.find((m) => m.id === msgId)?.read_at;
  }

  function saveDialogs(patches: readonly DialogPatch[]) {
    if (patches.length === 0) return;
    let dialogs = get().dialogs;
    let changed = false;
    for (const patch of patches) {
      const merged = mergeDialog(dialogs[patch.id], patch, (msgId) => isReadLocal(patch.id, msgId));
      if (!merged) continue;
      if (!changed) dialogs = { ...dialogs };
      changed = true;
      dialogs[patch.id] = merged;
      dirtyDialogs.add(patch.id);
    }
    if (!changed) return;
    set({ dialogs });
    dialogTimer ??= later(() => {
      dialogTimer = undefined;
      persistDialogs();
    }, PERSIST_DELAY);
  }

  function persistDialogs() {
    const { dialogs } = get();
    const records = [...dirtyDialogs].map((id) => dialogs[id]).filter((d): d is StoredDialog => !!d);
    dirtyDialogs.clear();
    background(cache.putMany('dialogs', records), 'persist dialogs');
  }

  async function deleteCachedMsgs(dialogId: number, keep?: ReadonlySet<number>) {
    const cached = await cache.query<Msg>('messages', { index: 'dialog_id', equals: dialogId });
    for (const m of cached) if (!keep?.has(m.id)) await cache.delete('messages', m.id);
  }

  /** 从本地忘掉会话（退群、解散、无权访问、服务端已删除） */
  function forgetDialogs(ids: readonly number[]) {
    const state = get();
    const present = ids.filter((id) => state.dialogs[id] || state.windows[id]);
    if (present.length === 0) return;
    const dialogs = { ...state.dialogs };
    const windows = { ...state.windows };
    for (const id of present) {
      delete dialogs[id];
      delete windows[id];
      dirtyDialogs.delete(id);
      background(cache.delete('dialogs', id), 'delete dialog');
      background(deleteCachedMsgs(id), 'delete messages');
    }
    windowOrder = windowOrder.filter((id) => !present.includes(id));
    set({ dialogs, windows, openId: present.includes(state.openId) ? 0 : state.openId });
  }

  const fetching = new Map<number, Promise<void>>();

  /** 取单个会话（本地没有的会话来了消息、被拉进群） */
  function fetchDialog(id: number): Promise<void> {
    let task = fetching.get(id);
    if (!task) {
      task = api
        .one(id)
        .then((d) => saveDialogs([d]))
        .finally(() => fetching.delete(id));
      fetching.set(id, task);
    }
    return task;
  }

  /** 打开（没有时创建）和某人的单聊，返回会话 id */
  async function openUser(userid: number): Promise<number> {
    const d = await api.openUser(userid);
    saveDialogs([d]);
    return d.id;
  }

  // R1 会话列表增量同步 ------------------------------------------------------

  interface SyncMark {
    /** 已同步到的最大 user_at（服务器时间，避免本机时钟偏差漏数据） */
    updated: string;
    /** 上次同步开始的时间（秒），取期间删除的会话 */
    deleted: number;
  }

  let syncing: Promise<void> | null = null;
  let syncAgain = false;

  function syncDialogs(): Promise<void> {
    if (syncing) {
      syncAgain = true;
      return syncing;
    }
    syncing = (async () => {
      do {
        syncAgain = false;
        await syncOnce();
      } while (syncAgain && !stopped);
    })().finally(() => {
      syncing = null;
    });
    return syncing;
  }

  async function syncOnce() {
    const mark = parseJson<SyncMark>(kv.get('sync'));
    const startedAt = Math.floor(now() / 1000);
    let updated = mark?.updated ?? '';
    for (let page = 1; ; page++) {
      const res = await api.lists({ page, pagesize: LIST_PAGE_SIZE, timerange: mark ? `${mark.updated},${mark.deleted}` : undefined });
      if (stopped) return;
      saveDialogs(res.data);
      for (const d of res.data) if (d.user_at && d.user_at > updated) updated = d.user_at;
      if (page === 1) {
        if (res.deleted_id?.length) forgetDialogs(res.deleted_id);
        background(prefetchLatest(res.data.map((d) => d.id)), 'prefetch latest');
      }
      if (res.current_page >= res.last_page || (!mark && page >= FULL_SYNC_PAGES)) break;
    }
    kv.set('sync', JSON.stringify({ updated, deleted: startedAt } satisfies SyncMark));
    set({ synced: true });
    background(syncBeyond(), 'beyond');
  }

  // R2 打开列表时把有缓存的会话补到最新 ----------------------------------------

  async function prefetchLatest(ids: readonly number[]) {
    const targets = ids
      .map((id) => get().dialogs[id])
      .filter((d): d is StoredDialog => !!d && !!d.cached_msg_id && !!d.last_msg && d.last_msg.id > d.cached_msg_id && !get().windows[d.id]);
    for (let i = 0; i < targets.length && !stopped; i += 5) {
      const chunk = targets.slice(i, i + 5);
      const msgs = await api.msgLatest(
        chunk.map((d) => ({ id: d.id, latest_id: d.cached_msg_id! })),
        LATEST_TAKE,
      );
      for (const d of chunk) {
        const list = msgs.filter((m) => m.dialog_id === d.id).sort((a, b) => b.id - a.id);
        if (list.length === 0 || get().windows[d.id]) continue;
        if (list.length >= LATEST_TAKE) {
          // 可能和缓存之间有缺口：缓存换成这批，最旧一条标「前面还有」
          list[list.length - 1] = { ...list[list.length - 1]!, prev_id: -1 };
          await deleteCachedMsgs(d.id);
        }
        await cache.putMany('messages', list);
        saveDialogs([{ id: d.id, cached_msg_id: list[0]!.id }]);
      }
    }
  }

  // R3 列表外的未读、待办会话 --------------------------------------------------

  async function syncBeyond() {
    const last = Number(kv.get('beyond') ?? 0);
    if (now() - last < BEYOND_INTERVAL) return;
    kv.set('beyond', String(now()));
    const dialogs = Object.values(get().dialogs);
    const earliest = (pick: (d: Dialog) => boolean) =>
      dialogs.reduce<string | undefined>((min, d) => (pick(d) && d.last_at && (!min || d.last_at < min) ? d.last_at : min), undefined);
    const nowSec = Math.floor(now() / 1000);
    const list = await api.beyond({
      unread_at: earliest((d) => (d.unread ?? 0) > 0) ?? nowSec,
      todo_at: earliest((d) => (d.todo_num ?? 0) > 0) ?? nowSec,
    });
    saveDialogs(list);
  }

  // ---------------------------------------------------------------------------
  // 消息窗口
  // ---------------------------------------------------------------------------

  const windowTimers = new Map<number, ReturnType<typeof setTimeout>>();
  const windowWrites = new Map<number, Promise<void>>();

  function setWindow(dialogId: number, patch: Partial<MsgWindow>) {
    const prev = get().windows[dialogId] ?? { list: [], synced: false, loading: null };
    set({ windows: { ...get().windows, [dialogId]: { ...prev, ...patch } } });
    if (patch.list && SLICES.some((key) => get()[key]?.dialogId === dialogId)) {
      const before = new Set(prev.list);
      syncSlices(dialogId, patch.list.filter((m) => !before.has(m)));
    }
    if (patch.list && !windowTimers.has(dialogId)) {
      windowTimers.set(
        dialogId,
        later(() => {
          windowTimers.delete(dialogId);
          background(persistWindow(dialogId), 'persist window');
        }, PERSIST_DELAY),
      );
    }
  }

  function persistWindow(dialogId: number) {
    const write = (windowWrites.get(dialogId) ?? Promise.resolve()).then(() => writeWindow(dialogId));
    windowWrites.set(dialogId, write);
    return write.finally(() => { if (windowWrites.get(dialogId) === write) windowWrites.delete(dialogId); });
  }

  /** 窗口在最新一端且和服务器对过时，把最新 CACHE_MSGS 条写进缓存 */
  async function writeWindow(dialogId: number) {
    const win = get().windows[dialogId];
    const revision = windowRevisions.get(dialogId) ?? 0;
    if (!win?.synced || !atLatest(win.list)) return;
    const slice = win.list.slice(0, CACHE_MSGS);
    const below = win.list[CACHE_MSGS];
    if (below) slice[slice.length - 1] = { ...slice[slice.length - 1]!, prev_id: below.id };
    await deleteCachedMsgs(dialogId, new Set(slice.map((m) => m.id)));
    if ((windowRevisions.get(dialogId) ?? 0) !== revision) return;
    await cache.putMany('messages', slice);
    if ((windowRevisions.get(dialogId) ?? 0) === revision) saveDialogs([{ id: dialogId, cached_msg_id: slice[0]?.id ?? 0 }]);
  }

  function touchWindow(dialogId: number) {
    windowOrder = [dialogId, ...windowOrder.filter((id) => id !== dialogId)];
    const evict = windowOrder.slice(MAX_WINDOWS).filter((id) => id !== get().openId);
    if (evict.length === 0) return;
    windowOrder = windowOrder.filter((id) => !evict.includes(id));
    const windows = { ...get().windows };
    for (const id of evict) delete windows[id];
    set({ windows });
  }

  /** 消息进来后（R13）：更新会话里的「第一条未读」、未读的 @ 我和最后一条消息 */
  function afterMsgs(dialogId: number, msgs: readonly Msg[]) {
    const d = get().dialogs[dialogId];
    if (!d) return;
    const patch: DialogPatch = { id: dialogId };
    let changed = false;
    if (get().openId !== dialogId) {
      for (const m of msgs) {
        if (m.read_at || m.userid === userId) continue;
        const current = patch.unread_one ?? d.unread_one ?? 0;
        patch.unread_one = current ? Math.min(current, m.id) : m.id;
        const mentions = patch.mention_ids ?? d.mention_ids ?? [];
        if (m.mention && !mentions.includes(m.id)) patch.mention_ids = [...mentions, m.id];
        changed = true;
      }
    }
    const last = d.last_msg && msgs.find((m) => m.id === d.last_msg!.id);
    if (last) {
      patch.last_msg = { ...d.last_msg!, ...last };
      patch.last_force = true;
      changed = true;
    }
    if (changed) saveDialogs([patch]);
  }

  /** 新消息或消息更新：有窗口的进窗口；没窗口但缓存是连续到最新的，追加进缓存 */
  function insertMsgs(dialogId: number, msgs: Msg[], isNew: boolean) {
    const win = get().windows[dialogId];
    if (win) {
      const ids = new Set(win.list.map((m) => m.id));
      const accepted = isNew && atLatest(win.list) ? msgs : msgs.filter((m) => ids.has(m.id));
      if (accepted.length) setWindow(dialogId, { list: upsertMsgs(win.list, accepted) });
    } else {
      const d = get().dialogs[dialogId];
      if (d?.cached_msg_id) {
        if (isNew && d.last_msg?.id === d.cached_msg_id) {
          background(cache.putMany('messages', msgs), 'cache push');
          saveDialogs([{ id: dialogId, cached_msg_id: Math.max(d.cached_msg_id, ...msgs.map((m) => m.id)) }]);
        } else if (!isNew) {
          background(updateCachedMsgs(msgs), 'cache update');
        }
      }
    }
    // 筛选、线程按自己的范围收：窗口没在最新一端、没开窗口（直接打开线程页）时也要进去
    syncSlices(dialogId, msgs);
    afterMsgs(dialogId, msgs);
  }

  async function updateCachedMsgs(msgs: Msg[]) {
    const existing = await cache.getMany<Msg>(
      'messages',
      msgs.map((m) => m.id),
    );
    const updated = existing.map((old) => upsertMsgs([old], msgs.filter((m) => m.id === old.id))[0]!);
    if (updated.length) await cache.putMany('messages', updated);
  }

  const loadingKeys = new Set<string>();
  const windowRevisions = new Map<number, number>();

  async function load(dialogId: number, kind: NonNullable<MsgWindow['loading']>, params: Omit<MsgListParams, 'dialog_id'>, apply: (list: Msg[], page: Msg[], time: number) => Msg[]) {
    const revision = windowRevisions.get(dialogId) ?? 0;
    const key = `${dialogId}:${kind}:${revision}`;
    if (loadingKeys.has(key)) return;
    loadingKeys.add(key);
    setWindow(dialogId, { loading: kind });
    try {
      const res = await api.msgList({ dialog_id: dialogId, take: MSG_PAGE_SIZE, ...params });
      if (stopped || !get().windows[dialogId] || (windowRevisions.get(dialogId) ?? 0) !== revision) return;
      setWindow(dialogId, { list: apply(get().windows[dialogId]!.list, res.list, res.time), synced: true });
      if (res.dialog) saveDialogs([res.dialog]);
      afterMsgs(dialogId, res.list);
    } finally {
      loadingKeys.delete(key);
      if ((windowRevisions.get(dialogId) ?? 0) === revision && get().windows[dialogId]?.loading === kind) setWindow(dialogId, { loading: null });
    }
  }

  /** 取最新一页（打开会话、回到底部、重连后补齐） */
  function loadLatest(dialogId: number) {
    return load(dialogId, 'latest', {}, applyLatestPage);
  }

  function loadEarlier(dialogId: number) {
    const win = get().windows[dialogId];
    if (!win?.synced || !hasEarlier(win.list)) return Promise.resolve();
    return load(dialogId, 'earlier', { prev_id: earlierCursor(win.list) }, (list, page) => applyEarlierPage(list, page));
  }

  function loadNewer(dialogId: number) {
    const win = get().windows[dialogId];
    if (!win?.synced || atLatest(win.list)) return Promise.resolve();
    return load(dialogId, 'newer', { next_id: newerCursor(win.list) }, (list, page) => applyNewerPage(list, page));
  }

  /** 跳到某条消息（回复原文、搜索结果、第一条未读、推送点击） */
  function loadAround(dialogId: number, msgId: number) {
    const win = get().windows[dialogId];
    if (win?.synced && win.list.some((m) => m.id === msgId)) return Promise.resolve();
    return load(dialogId, 'around', { position_id: msgId }, (list, page) => applyAroundPage(list, page));
  }

  /** 打开会话：先显示缓存，再取最新一页 */
  async function openDialog(dialogId: number) {
    const revision = windowRevisions.get(dialogId) ?? 0;
    set({ openId: dialogId });
    touchWindow(dialogId);
    if (!get().windows[dialogId]) {
      setWindow(dialogId, {});
      const cached = await cache.query<Msg>('messages', { index: 'dialog_id', equals: dialogId });
      if ((windowRevisions.get(dialogId) ?? 0) !== revision) return;
      const win = get().windows[dialogId];
      if (win && !win.synced && win.list.length === 0 && cached.length) {
        set({ windows: { ...get().windows, [dialogId]: { ...win, list: upsertMsgs([], cached) } } });
      }
    }
    await loadLatest(dialogId);
  }

  /** 丢掉窗口和缓存里的消息重新取最新一页（AI 机器人单聊切换会话后，消息只属于当前会话） */
  async function reloadDialog(dialogId: number) {
    const revision = (windowRevisions.get(dialogId) ?? 0) + 1;
    windowRevisions.set(dialogId, revision);
    if (get().filter?.dialogId === dialogId) set({ filter: null });
    setWindow(dialogId, { list: [], synced: false, loading: null });
    saveDialogs([{ id: dialogId, cached_msg_id: 0 }]);
    await windowWrites.get(dialogId);
    await deleteCachedMsgs(dialogId);
    if (windowRevisions.get(dialogId) !== revision) return;
    await load(dialogId, 'latest', {}, (_list, page, time) => applyLatestPage([], page, time));
  }

  // ---------------------------------------------------------------------------
  // 分类筛选（聊天页分类条）
  // ---------------------------------------------------------------------------

  /** 每次换筛选、换线程加一，旧请求回来时丢掉 */
  const sliceSeq: Record<SliceKey, number> = { filter: 0, thread: 0 };

  function patchSlice(key: SliceKey, patch: Partial<MsgSlice>) {
    const slice = get()[key];
    if (slice) set({ [key]: { ...slice, ...patch } } as Pick<MessengerState, SliceKey>);
  }

  /** 消息是否属于这一段 */
  function inSlice(key: SliceKey, m: Msg) {
    const { filter, thread } = get();
    return key === 'filter' ? !!filter && matchesFilter(m, filter.type) : m.reply_id === thread?.msgId;
  }

  /** 换分类（null 为看全部）：取该分类最新一页 */
  function setFilter(dialogId: number, type: MsgFilterType | null) {
    const seq = ++sliceSeq.filter;
    if (!type) {
      if (get().filter) set({ filter: null });
      return Promise.resolve();
    }
    set({ filter: { dialogId, type, list: [], earlier: 0, ready: false, loading: true } });
    return loadSlice('filter', seq, 0);
  }

  /** 打开回复线程（F7）：取被回复的那条（窗口里有就直接用）和最新一页回复 */
  function openThread(dialogId: number, msgId: number) {
    const seq = ++sliceSeq.thread;
    const root = get().windows[dialogId]?.list.find((m) => m.id === msgId) ?? null;
    set({ thread: { dialogId, msgId, root, list: [], earlier: 0, ready: false, loading: true } });
    const loadRoot = root
      ? Promise.resolve()
      : api.msgOne(msgId).then((msg) => {
          if (seq === sliceSeq.thread) patchSlice('thread', { root: msg } as Partial<MsgThread>);
        });
    return Promise.all([loadRoot, loadSlice('thread', seq, 0)]).then(() => {});
  }

  function closeThread() {
    sliceSeq.thread++;
    if (get().thread) set({ thread: null });
  }

  function loadEarlierIn(key: SliceKey) {
    const slice = get()[key];
    if (!slice?.ready || slice.loading || !slice.earlier) return Promise.resolve();
    patchSlice(key, { loading: true });
    return loadSlice(key, sliceSeq[key], slice.earlier);
  }

  async function loadSlice(key: SliceKey, seq: number, prevId: number) {
    const { filter, thread } = get();
    const query = key === 'filter' ? { dialog_id: filter!.dialogId, msg_type: filter!.type } : { dialog_id: thread!.dialogId, msg_id: thread!.msgId };
    try {
      const res = await api.msgList({ ...query, take: MSG_PAGE_SIZE, ...(prevId ? { prev_id: prevId } : {}) });
      const slice = get()[key];
      if (stopped || seq !== sliceSeq[key] || !slice) return;
      // 这页最旧一条的 prev_id 只表示更早还有；从它的前一个 id 往前取，中间新标注、新设待办的也能取到
      const oldest = res.list[res.list.length - 1];
      const earlier = oldest && (oldest.prev_id ?? 0) > 0 ? oldest.id - 1 : 0;
      patchSlice(key, { list: upsertMsgs(slice.list, res.list), earlier, ready: true, loading: false });
    } catch (err) {
      if (seq === sliceSeq[key]) patchSlice(key, { loading: false });
      throw err;
    }
  }

  /**
   * 窗口里变化的消息同步到筛选、线程：已在里面的更新，不再属于的去掉（取消标注、取消待办）；
   * 新属于的，落在已取到的范围内才加（更早的等往前翻时由服务端给）。线程的被回复那条也跟着更新
   */
  function syncSlices(dialogId: number, changed: readonly Msg[]) {
    if (changed.length === 0) return;
    for (const key of SLICES) {
      const slice = get()[key];
      if (!slice?.ready || slice.dialogId !== dialogId) continue;
      const ids = new Set(slice.list.map((m) => m.id));
      const add: Msg[] = [];
      const drop: number[] = [];
      for (const m of changed) {
        if (inSlice(key, m)) {
          if (ids.has(m.id) || m.id > slice.earlier) add.push(m);
        } else if (ids.has(m.id)) {
          drop.push(m.id);
        }
      }
      if (add.length || drop.length) patchSlice(key, { list: upsertMsgs(removeMsgs(slice.list, drop), add) });
    }
    const thread = get().thread;
    const root = thread?.dialogId === dialogId && changed.find((m) => m.id === thread.msgId);
    if (root) patchSlice('thread', { root } as Partial<MsgThread>);
  }

  /** 新回复进来、回复被删：被回复那条的回复数跟着变（同旧前端 increaseMsgReplyNum） */
  function bumpReplies(dialogId: number, replyId: number | null | undefined, delta: number) {
    if (!replyId) return;
    const pick = (m: Msg) => m.id === replyId;
    const current = get().windows[dialogId]?.list.find(pick) ?? (get().thread?.msgId === replyId ? get().thread!.root : null);
    if (!current) return;
    setMsgs(dialogId, pick, { reply_num: Math.max(0, (current.reply_num ?? 0) + delta) });
  }

  /** 消息被删除或撤回：从窗口、筛选、线程里去掉 */
  function dropMsgs(dialogId: number, ids: readonly number[]) {
    const win = get().windows[dialogId];
    const gone = [...(win?.list ?? []), ...(get().thread?.list ?? [])].filter((m) => m.dialog_id === dialogId && ids.includes(m.id));
    if (win) setWindow(dialogId, { list: removeMsgs(win.list, ids) });
    for (const key of SLICES) {
      const slice = get()[key];
      if (slice?.dialogId === dialogId) patchSlice(key, { list: removeMsgs(slice.list, ids) });
    }
    for (const id of new Set(gone.map((m) => m.id))) bumpReplies(dialogId, gone.find((m) => m.id === id)!.reply_id, -1);
  }

  /** 打开期间收到过别人新消息的会话（R20 没加未读） */
  const arrivedWhileOpen = new Set<number>();

  function closeDialog(dialogId: number) {
    if (get().openId === dialogId) set({ openId: 0 });
    for (const key of SLICES) {
      if (get()[key]?.dialogId !== dialogId) continue;
      sliceSeq[key]++;
      set({ [key]: null });
    }
    cancel(windowTimers.get(dialogId));
    windowTimers.delete(dialogId);
    background(persistWindow(dialogId), 'persist window');
    if (arrivedWhileOpen.delete(dialogId)) background(reconcileUnread(dialogId), 'unread');
  }

  /** 打开期间来的消息不一定都看到了（停在上面翻历史）：先把攒着的已读报掉，再以服务端的未读为准 */
  async function reconcileUnread(dialogId: number) {
    cancel(readTimer);
    readTimer = undefined;
    await flushRead();
    saveDialogs([await api.msgUnread(dialogId)]);
  }

  // ---------------------------------------------------------------------------
  // R12 推送
  // ---------------------------------------------------------------------------

  function handlePush(push: SocketMessage) {
    const mode = typeof push.mode === 'string' ? push.mode : '';
    const data = (push.data ?? {}) as Record<string, unknown>;
    const id = Number(data.id) || 0;
    switch (mode) {
      case 'add':
      case 'chat': {
        const msg = msgOf(data);
        if (msg) onPushMsg(msg, data, mode === 'add', !!push.silence);
        break;
      }
      case 'update':
      case 'readed':
        patchMsg(data);
        break;
      case 'delete':
        onPushDelete(data);
        break;
      case 'groupAdd':
      case 'groupJoin':
      case 'groupRestore':
        if (id) background(fetchDialog(id), 'fetch dialog');
        break;
      case 'groupUpdate':
        if (id && get().dialogs[id]) saveDialogs([data as DialogPatch]);
        break;
      case 'groupExit':
      case 'groupDelete':
        if (id) forgetDialogs([id]);
        break;
      case 'updateTopMsg': {
        const dialogId = Number(data.dialog_id) || 0;
        if (dialogId) saveDialogs([{ id: dialogId, top_msg_id: Number(data.top_msg_id) || 0, top_userid: Number(data.top_userid) || 0 }]);
        break;
      }
    }
  }

  /** 消息更新：推送可能只带变化的字段（如表情回应只有 id 和 emoji），按 id 合并进已有的消息 */
  function patchMsg(data: Record<string, unknown>) {
    const full = msgOf(data);
    if (full) {
      insertMsgs(full.dialog_id, [full], false);
      if ('todo' in data) refreshTodo(full.dialog_id);
      return;
    }
    const id = Number(data.id) || 0;
    if (!id) return;
    for (const [dialogId, win] of Object.entries(get().windows)) {
      const old = win.list.find((m) => m.id === id);
      if (old) {
        insertMsgs(Number(dialogId), [{ ...old, ...data } as Msg], false);
        if ('todo' in data) refreshTodo(old.dialog_id);
        return;
      }
    }
    if ('todo' in data && Number(data.dialog_id)) refreshTodo(Number(data.dialog_id));
    background(
      cache.getMany<Msg>('messages', [id]).then((found) => (found.length ? cache.putMany('messages', [{ ...found[0]!, ...data } as Msg]) : undefined)),
      'cache patch',
    );
  }

  /** 消息的待办变了（设、取消、完成，自己或别人操作）：会话上「我未完成的待办数」以服务端为准 */
  function refreshTodo(dialogId: number) {
    if (!get().dialogs[dialogId]) return;
    background(
      api.myTodos(dialogId).then((list) => saveDialogs([{ id: dialogId, todo_num: list.length }])),
      'todo',
    );
  }

  function onPushMsg(msg: Msg, data: Record<string, unknown>, isAdd: boolean, silence: boolean) {
    const exists = !!get().windows[msg.dialog_id]?.list.some((m) => m.id === msg.id) || !!get().thread?.list.some((m) => m.id === msg.id);
    if (!exists && isAdd) bumpReplies(msg.dialog_id, msg.reply_id, 1);
    const d = get().dialogs[msg.dialog_id];
    if (!exists && isAdd && msg.userid !== userId) {
      // R20 正在看的会话不加未读，由已读上报清掉；关闭时再和服务端对一次
      if (d && get().openId === d.id) arrivedWhileOpen.add(d.id);
      else if (d) {
        saveDialogs([
          {
            id: d.id,
            unread: (d.unread ?? 0) + 1,
            mention: (d.mention ?? 0) + (msg.mention ? 1 : 0),
            user_at: typeof data.user_at === 'string' ? data.user_at : undefined,
            user_ms: typeof data.user_ms === 'number' ? data.user_ms : undefined,
          },
        ]);
      }
      incomingListeners.forEach((fn) => fn({ msg, silence }));
    }
    insertMsgs(msg.dialog_id, [msg], true);
    if (!isAdd) return;
    // 服务端收到新消息会取消「不显示该会话」
    if (d) saveDialogs([{ ...lastMsgPatch(msg), hide: 0 }]);
    else background(fetchDialog(msg.dialog_id), 'fetch dialog');
  }

  function onPushDelete(data: Record<string, unknown>) {
    const dialogId = Number(data.dialog_id) || 0;
    const ids = (Array.isArray(data.id) ? data.id : [data.id]).map(Number).filter(Boolean);
    dropMsgs(dialogId, ids);
    for (const id of ids) background(cache.delete('messages', id), 'delete message');
    if (!get().dialogs[dialogId]) return;
    const last = (data.last_msg ?? null) as Dialog['last_msg'];
    const patch: DialogPatch = { id: dialogId, last_msg: last, last_at: last?.created_at ?? formatTime(now()), last_force: true };
    if (data.update_read) {
      background(
        api.msgUnread(dialogId).then((unread) => saveDialogs([{ ...patch, ...unread }])),
        'unread',
      );
    } else {
      saveDialogs([patch]);
    }
  }

  // ---------------------------------------------------------------------------
  // R14 已读上报、R15 标记
  // ---------------------------------------------------------------------------

  /** 消息 id → 会话 id（批量：该会话里 id ≥ 它的一起标已读）或 0（只标这一条） */
  const readQueue = new Map<number, number>();
  let readTimer: ReturnType<typeof setTimeout> | undefined;

  /** 改窗口里的消息（已读、回应、回复数）；筛选、线程里有不在窗口的同一条也改 */
  function setMsgs(dialogId: number, pick: (m: Msg) => boolean, patch: Partial<Msg>) {
    const win = get().windows[dialogId];
    if (win?.list.some(pick)) setWindow(dialogId, { list: win.list.map((m) => (pick(m) ? { ...m, ...patch } : m)) });
    for (const key of SLICES) {
      const slice = get()[key];
      if (slice?.dialogId === dialogId && slice.list.some(pick)) patchSlice(key, { list: slice.list.map((m) => (pick(m) ? { ...m, ...patch } : m)) });
    }
    const root = get().thread?.root;
    if (root?.dialog_id === dialogId && pick(root)) patchSlice('thread', { root: { ...root, ...patch } } as Partial<MsgThread>);
  }

  /** 消息出现在可见区域时调用 */
  function markRead(msg: Msg) {
    if (msg.userid === userId || msg.read_at) return;
    setMsgs(msg.dialog_id, (m) => m.id === msg.id, { read_at: formatTime(now()) });
    const d = get().dialogs[msg.dialog_id];
    let bulk = false;
    if (d) {
      const patch: DialogPatch = { id: d.id };
      if (d.unread_one === msg.id) {
        patch.unread_one = 0;
        bulk = true;
      }
      if (d.mention_ids?.includes(msg.id)) {
        patch.mention_ids = d.mention_ids.filter((id) => id !== msg.id);
        bulk = true;
      }
      if (bulk) saveDialogs([patch]);
    }
    readQueue.set(msg.id, bulk ? msg.dialog_id : (readQueue.get(msg.id) ?? 0));
    scheduleRead();
  }

  function scheduleRead() {
    cancel(readTimer);
    readTimer = later(() => {
      readTimer = undefined;
      background(flushRead(), 'read');
    }, READ_DELAY);
  }

  async function flushRead() {
    if (readQueue.size === 0) return;
    const batch = [...readQueue].slice(0, READ_BATCH);
    for (const [id] of batch) readQueue.delete(id);
    try {
      const res = await api.msgRead(Object.fromEntries(batch));
      for (const [msgId, dialogId] of batch) {
        if (dialogId) setMsgs(dialogId, (m) => m.id >= msgId && !m.read_at && m.userid !== userId, { read_at: formatTime(now()) });
      }
      saveDialogs(res);
    } catch (err) {
      // 失败的放回队列，下次有已读或重连时再报；本地已读标记撤回，滚动到时还会再触发
      for (const [msgId, dialogId] of batch) {
        if (!readQueue.has(msgId)) readQueue.set(msgId, dialogId);
        for (const win of Object.entries(get().windows)) {
          if (win[1].list.some((m) => m.id === msgId)) setMsgs(Number(win[0]), (m) => m.id === msgId, { read_at: null });
        }
      }
      throw err;
    }
    if (readQueue.size) scheduleRead();
  }

  /** R15 整个会话标为已读 / 未读 */
  async function markDialog(dialogId: number, type: 'read' | 'unread') {
    const res = await api.msgMark({ dialog_id: dialogId, type });
    if (type === 'read') setMsgs(dialogId, (m) => !m.read_at && m.userid !== userId, { read_at: formatTime(now()) });
    saveDialogs([res]);
  }

  /** R15 语音消息播放后清红点 */
  function clearDot(msg: Msg) {
    if (!msg.dot) return;
    setMsgs(msg.dialog_id, (m) => m.id === msg.id, { dot: 0 });
    background(api.msgDot(msg.id), 'dot');
  }

  // ---------------------------------------------------------------------------
  // 会话操作（N2 列表菜单）
  // ---------------------------------------------------------------------------

  async function toggleTop(dialogId: number) {
    const res = await api.top(dialogId);
    saveDialogs([{ id: dialogId, top_at: res.top_at }]);
  }

  async function hideDialog(dialogId: number) {
    await api.hide(dialogId);
    saveDialogs([{ id: dialogId, hide: 1 }]);
  }

  async function setSilence(dialogId: number, on: boolean) {
    const res = await api.silence(dialogId, on);
    saveDialogs([{ id: dialogId, silence: res.silence }]);
    // 开启免打扰时服务端把未读都标成已读了
    if (on) saveDialogs([await api.msgUnread(dialogId)]);
  }

  async function setColor(dialogId: number, value: string) {
    const res = await api.color(dialogId, value);
    saveDialogs([{ id: dialogId, color: res.color }]);
  }

  // ---------------------------------------------------------------------------
  // R19 草稿
  // ---------------------------------------------------------------------------

  let draftTimer: ReturnType<typeof setTimeout> | undefined;

  function setDraft(dialogId: number, html: string) {
    const drafts = { ...get().drafts };
    if (html) drafts[dialogId] = html;
    else delete drafts[dialogId];
    set({ drafts });
    cancel(draftTimer);
    draftTimer = later(() => {
      draftTimer = undefined;
      kv.set('drafts', JSON.stringify(get().drafts));
    }, PERSIST_DELAY);
  }

  // ---------------------------------------------------------------------------
  // R18 发送队列
  // ---------------------------------------------------------------------------

  let flushing = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let localSeq = 0;

  function setOutbox(outbox: OutboxItem[]) {
    set({ outbox });
    kv.set('outbox', JSON.stringify(outbox));
  }

  function patchOutbox(localId: string, patch: Partial<OutboxItem>) {
    setOutbox(get().outbox.map((item) => (item.localId === localId ? { ...item, ...patch } : item)));
  }

  /** 发送文本：先进队列显示发送中，按顺序发出。返回本地 id */
  function sendText(params: Pick<OutboxItem, 'dialog_id' | 'text' | 'md' | 'reply_id' | 'silence' | 'model_name'>): string {
    const localId = `local-${now()}-${++localSeq}`;
    const dialog = get().dialogs[params.dialog_id];
    const model_name = dialog && isAiBotDialog(dialog) ? get().aiModels[dialog.id] : undefined;
    setOutbox([...get().outbox, { localId, ...params, model_name: params.model_name ?? model_name, queuedAt: now(), state: 'sending' }]);
    background(flushOutbox(), 'outbox');
    return localId;
  }

  function selectAiModel(dialogId: number, model: string) {
    const aiModels = { ...get().aiModels, [dialogId]: model };
    set({ aiModels });
    kv.set('aiModels', JSON.stringify(aiModels));
  }

  function retrySend(localId: string) {
    patchOutbox(localId, { state: 'sending', queuedAt: now(), error: undefined });
    background(flushOutbox(), 'outbox');
  }

  function discardSend(localId: string) {
    setOutbox(get().outbox.filter((item) => item.localId !== localId));
  }

  async function flushOutbox() {
    if (flushing) return;
    flushing = true;
    try {
      while (!stopped) {
        const item = get().outbox.find((i) => i.state === 'sending');
        if (!item) break;
        if (now() - item.queuedAt > OUTBOX_EXPIRE) {
          patchOutbox(item.localId, { state: 'failed', error: '' });
          continue;
        }
        try {
          const msg = await api.sendText({ dialog_id: item.dialog_id, text: item.text, md: item.md, reply_id: item.reply_id, silence: item.silence, model_name: item.model_name });
          set({ sentKeys: { ...get().sentKeys, [msg.id]: item.localId } });
          discardSend(item.localId);
          bumpReplies(msg.dialog_id, msg.reply_id, 1);
          insertMsgs(msg.dialog_id, [msg], true);
          if (get().dialogs[msg.dialog_id]) saveDialogs([lastMsgPatch(msg)]);
          else background(fetchDialog(msg.dialog_id), 'fetch dialog');
        } catch (err) {
          if (err instanceof ApiError && err.kind === 'network') {
            // 断网：保持顺序，整个队列等网络恢复（重连）或 30 秒后再试
            cancel(retryTimer);
            retryTimer = later(() => background(flushOutbox(), 'outbox'), OUTBOX_RETRY);
            break;
          }
          patchOutbox(item.localId, { state: 'failed', error: err instanceof Error ? err.message : '' });
        }
      }
    } finally {
      flushing = false;
    }
  }

  // ---------------------------------------------------------------------------
  // 发文件
  // ---------------------------------------------------------------------------

  /** 上传进度（本地 id → 0–1）单独一个 store：进度变化频繁，只让对应的那一行订阅 */
  const progress = createStore<Record<string, number>>()(() => ({}));
  const uploading = new Map<string, AbortController>();

  function setProgress(localId: string, value: number | null) {
    const current = progress.getState();
    if (value === null) {
      if (!(localId in current)) return;
      const { [localId]: _, ...rest } = current;
      progress.setState(rest, true);
    } else if (current[localId] === undefined || value - current[localId] >= PROGRESS_STEP || value === 1) {
      progress.setState({ [localId]: value });
    }
  }

  function patchUpload(localId: string, patch: Partial<UploadItem>) {
    set({ uploads: get().uploads.map((item) => (item.localId === localId ? { ...item, ...patch } : item)) });
  }

  /**
   * 发文件：每个文件一条消息，先进队列显示发送中（带进度）。只在本次运行里保留。
   * 上传完成即发出消息，所以同一会话一个一个传，消息顺序和选择顺序一致；不同会话之间同时最多传两个。
   * caption（HTML）挂在最后一个文件上，它发出或失败后作为文字发出，排在文件之后
   */
  function sendFiles(params: { dialog_id: number; files: readonly LocalFile[]; reply_id?: number; caption?: string }) {
    const last = params.files.length - 1;
    const items = params.files.map((file, index): UploadItem => ({
      localId: `local-${now()}-${++localSeq}`,
      dialog_id: params.dialog_id,
      reply_id: params.reply_id,
      file,
      queuedAt: now(),
      state: 'sending',
      caption: index === last ? params.caption || undefined : undefined,
    }));
    set({ uploads: [...get().uploads, ...items] });
    pumpUploads();
  }

  /** 发语音：和文件同一个队列（同一会话按顺序发出、失败可重发），只是走语音接口、没有进度 */
  function sendRecord(params: RecordUpload & { reply_id?: number }) {
    const item: UploadItem = { localId: `local-${now()}-${++localSeq}`, dialog_id: params.dialog_id, reply_id: params.reply_id, file: params.file, duration: params.duration, queuedAt: now(), state: 'sending' };
    set({ uploads: [...get().uploads, item] });
    pumpUploads();
  }

  function retryUpload(localId: string) {
    patchUpload(localId, { state: 'sending', error: undefined });
    pumpUploads();
  }

  /** 取消上传中的文件，或放弃发送失败的文件 */
  function discardUpload(localId: string) {
    const item = get().uploads.find((i) => i.localId === localId);
    if (!item) return;
    uploading.get(localId)?.abort();
    set({ uploads: get().uploads.filter((i) => i.localId !== localId) });
    api.forgetFile(localId, item.file);
  }

  function pumpUploads() {
    const busy = new Set(get().uploads.filter((item) => uploading.has(item.localId)).map((item) => item.dialog_id));
    for (const item of get().uploads) {
      if (stopped || uploading.size >= UPLOAD_CONCURRENCY) return;
      if (item.state !== 'sending' || busy.has(item.dialog_id)) continue;
      busy.add(item.dialog_id);
      background(upload(item), 'upload');
    }
  }

  async function upload(item: UploadItem) {
    const controller = new AbortController();
    uploading.set(item.localId, controller);
    setProgress(item.localId, 0);
    try {
      const data = item.duration === undefined
        ? await api.sendFile({
          file: item.file,
          dialogId: item.dialog_id,
          replyId: item.reply_id ?? 0,
          key: item.localId,
          signal: controller.signal,
          onProgress: (ratio) => setProgress(item.localId, ratio),
        })
        : await api.sendRecord({ dialog_id: item.dialog_id, file: item.file, duration: item.duration, reply_id: item.reply_id });
      set({ uploads: get().uploads.filter((i) => i.localId !== item.localId) });
      const msg = msgOf(data);
      if (msg) {
        set({ sentKeys: { ...get().sentKeys, [msg.id]: item.localId } });
        bumpReplies(msg.dialog_id, msg.reply_id, 1);
        insertMsgs(msg.dialog_id, [msg], true);
        if (get().dialogs[msg.dialog_id]) saveDialogs([lastMsgPatch(msg)]);
        else background(fetchDialog(msg.dialog_id), 'fetch dialog');
      }
      if (item.caption) sendText({ dialog_id: item.dialog_id, text: item.caption });
    } catch (err) {
      if (err instanceof UploadCancelled || controller.signal.aborted) return;
      if (item.caption) sendText({ dialog_id: item.dialog_id, text: item.caption });
      // 网络问题的报错对用户没有意义，留空由界面兜底
      patchUpload(item.localId, { state: 'failed', error: err instanceof ApiError && err.kind === 'server' ? err.message : '', caption: undefined });
    } finally {
      uploading.delete(item.localId);
      setProgress(item.localId, null);
      pumpUploads();
    }
  }

  // ---------------------------------------------------------------------------
  // 编辑、撤回、表情回应
  // ---------------------------------------------------------------------------

  /** 编辑自己发的文本，成功后替换原消息；失败抛出服务端的提示 */
  async function editText(params: { dialog_id: number; update_id: number; text: string }) {
    const msg = await api.sendText(params);
    insertMsgs(msg.dialog_id, [msg], false);
  }

  function setWithdrawn(list: WithdrawnMsg[]) {
    set({ withdrawn: list });
  }

  /**
   * 撤回自己的消息。文本消息先在本地记下原文（5 分钟内可以重新编辑），
   * 这样原消息被推送或接口响应删掉的同一刻占位就顶上，不闪
   */
  async function withdraw(msg: Msg) {
    const body = (msg.msg ?? {}) as { text?: unknown; type?: unknown };
    const keep = msg.type === 'text' && typeof body.text === 'string' && body.text !== '';
    if (keep) {
      setWithdrawn([...get().withdrawn.filter((w) => w.id !== msg.id), { id: msg.id, dialog_id: msg.dialog_id, text: body.text as string, md: body.type === 'md', created_at: msg.created_at, at: now() }]);
      later(() => forgetWithdrawn(msg.id), WITHDRAWN_KEEP);
    }
    try {
      await api.withdraw(msg.id);
    } catch (err) {
      // 接口报错但服务端可能已经撤回（消息已被推送删掉），这时保留占位
      if (keep && get().windows[msg.dialog_id]?.list.some((m) => m.id === msg.id)) forgetWithdrawn(msg.id);
      throw err;
    }
    // 会话的最后一条由服务端的 delete 推送更新
    dropMsgs(msg.dialog_id, [msg.id]);
    background(cache.delete('messages', msg.id), 'delete message');
  }

  /** 重新编辑或过期后去掉撤回占位 */
  function forgetWithdrawn(id: number) {
    if (get().withdrawn.some((w) => w.id === id)) setWithdrawn(get().withdrawn.filter((w) => w.id !== id));
  }

  /** 点按回应胶囊：先在本地切换，再用服务端的结果覆盖；失败时还原 */
  async function toggleEmoji(msg: Msg, symbol: string) {
    const current = get().windows[msg.dialog_id]?.list.find((m) => m.id === msg.id) ?? msg;
    const before = (current as { emoji?: { symbol: string; userids: number[] }[] }).emoji ?? [];
    setMsgs(msg.dialog_id, (m) => m.id === msg.id, { emoji: toggledEmoji(before, symbol, userId) } as Partial<Msg>);
    try {
      const res = await api.emoji(msg.id, symbol);
      setMsgs(msg.dialog_id, (m) => m.id === msg.id, { emoji: res.emoji } as Partial<Msg>);
    } catch (err) {
      setMsgs(msg.dialog_id, (m) => m.id === msg.id, { emoji: before } as Partial<Msg>);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // 其他消息操作的结果（actions.ts）
  // ---------------------------------------------------------------------------

  /**
   * 操作消息的接口结果：add 是新产生的消息（系统提示、转发出去的消息），插进各自的会话并更新会话的最后一条；
   * update 是某条消息变化的字段，合并进去。推送稍后也会带来同样的内容，按 id 去重
   */
  function applyResult(result: { add?: unknown; update?: Record<string, unknown> | null }) {
    if (result.update) patchMsg(result.update);
    const added = (Array.isArray(result.add) ? result.add : [result.add]).map(msgOf).filter((m): m is Msg => !!m);
    for (const msg of added) {
      insertMsgs(msg.dialog_id, [msg], true);
      if (get().dialogs[msg.dialog_id]) saveDialogs([lastMsgPatch(msg)]);
    }
  }

  // ---------------------------------------------------------------------------
  // 生命周期
  // ---------------------------------------------------------------------------

  /** R16 重连、回到前台：增量同步列表，打开中的会话取最新一页，补报已读和发送 */
  function catchUp() {
    background(syncDialogs(), 'sync');
    const { openId, windows } = get();
    const stale = Object.fromEntries(Object.entries(windows).map(([id, w]) => [id, Number(id) === openId ? w : { ...w, synced: false }]));
    set({ windows: stale });
    if (openId) background(loadLatest(openId), 'load latest');
    background(flushRead(), 'read');
    background(flushOutbox(), 'outbox');
  }

  /** R17 冷启动：先读缓存画出来，再和服务器同步 */
  async function start() {
    const dialogs = await cache.query<StoredDialog>('dialogs');
    if (stopped) return;
    set({
      ready: true,
      dialogs: Object.fromEntries(dialogs.map((d) => [d.id, d])),
      drafts: parseJson<Record<number, string>>(kv.get('drafts')) ?? {},
      aiModels: parseJson<Record<number, string>>(kv.get('aiModels')) ?? {},
      outbox: parseJson<OutboxItem[]>(kv.get('outbox')) ?? [],
    });
    unsubs.push(
      deps.socket.on('dialog', handlePush),
      deps.socket.onOpen(({ reconnect }) => {
        if (reconnect) catchUp();
      }),
    );
    background(syncDialogs(), 'sync');
    background(flushOutbox(), 'outbox');
  }

  function stop() {
    stopped = true;
    uploading.forEach((controller) => controller.abort());
    unsubs.splice(0).forEach((fn) => fn());
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    incomingListeners.clear();
  }

  /** 退出登录：清掉这个账号的缓存和小数据 */
  async function clear() {
    stop();
    for (const name of ['sync', 'beyond', 'drafts', 'outbox', 'aiModels'] as const) kv.remove(name);
    await cache.clear('messages');
    await cache.clear('dialogs');
  }

  return {
    store,
    start,
    stop,
    clear,
    catchUp,
    syncDialogs,
    fetchDialog,
    openUser,
    forgetDialogs,
    openDialog,
    reloadDialog,
    selectAiModel,
    closeDialog,
    loadLatest,
    loadEarlier,
    loadNewer,
    loadAround,
    setFilter,
    openThread,
    closeThread,
    loadFilterEarlier: () => loadEarlierIn('filter'),
    loadThreadEarlier: () => loadEarlierIn('thread'),
    markRead,
    markDialog,
    clearDot,
    toggleTop,
    hideDialog,
    setSilence,
    setColor,
    setDraft,
    sendText,
    retrySend,
    discardSend,
    /** 上传进度（本地 id → 0–1） */
    uploadProgress: progress,
    sendFiles,
    sendRecord,
    convertRecord: (params: RecordUpload) => api.convertRecord(params),
    retryUpload,
    discardUpload,
    editText,
    withdraw,
    forgetWithdrawn,
    toggleEmoji,
    applyResult,
    refreshTodo,
    /** 改会话上的字段（置顶消息等操作的结果） */
    patchDialog: (patch: DialogPatch) => saveDialogs([patch]),
    /** 别人发来的新消息（通知、横幅） */
    onIncoming(fn: (e: IncomingMessage) => void) {
      incomingListeners.add(fn);
      return () => incomingListeners.delete(fn);
    },
  };
}

export type Messenger = ReturnType<typeof createMessenger>;
