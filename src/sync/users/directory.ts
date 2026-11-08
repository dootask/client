import { createStore } from 'zustand/vanilla';

import { BASIC_BATCH, type UserBasic } from '../api/users';
import type { StructuredCache } from '../storage/types';

/** 缓存里的用户：多记一个取回时间，过期后再用时后台刷新 */
export type CachedUser = UserBasic & { fetched_at: number };

export interface UserDirectoryState {
  users: Record<number, CachedUser>;
}

export interface UserDirectoryDeps {
  /** users/basic，一次不超过 BASIC_BATCH 个 */
  fetchBasic: (userids: readonly number[]) => Promise<UserBasic[]>;
  cache: StructuredCache;
  now?: () => number;
  log?: (...args: unknown[]) => void;
}

/** 过了这么久再用到时后台刷新（头像、昵称改了能跟上） */
const STALE = 3600_000;
/** 攒一小会儿再查，列表一屏的头像合成一两个请求 */
const BATCH_DELAY = 30;
/** 取不到的 id 隔这么久再试 */
const RETRY = 60_000;

/**
 * 其他用户的基础信息（昵称、头像等）。界面用到哪些人就 want 哪些，攒批后先读缓存、再向服务端补齐或刷新。
 * 一个实例对应一个登录账号
 */
export function createUserDirectory(deps: UserDirectoryDeps) {
  const { fetchBasic, cache } = deps;
  const now = deps.now ?? Date.now;
  const log = deps.log ?? (() => {});
  const store = createStore<UserDirectoryState>()(() => ({ users: {} }));

  let stopped = false;
  /** 已经处理过（排队、读缓存、请求中或最近失败）的 id → 时间 */
  const handled = new Map<number, number>();
  let pending = new Set<number>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  function merge(list: readonly CachedUser[]) {
    if (list.length === 0) return;
    store.setState((s) => {
      const users = { ...s.users };
      for (const u of list) users[u.userid] = u;
      return { users };
    });
  }

  async function fetchFresh(ids: number[]) {
    for (let i = 0; i < ids.length; i += BASIC_BATCH) {
      const chunk = ids.slice(i, i + BASIC_BATCH);
      try {
        const at = now();
        const list = (await fetchBasic(chunk)).map((u) => ({ ...u, fetched_at: at }));
        if (stopped) return;
        merge(list);
        await cache.putMany('users', list);
        for (const u of list) handled.delete(u.userid);
      } catch (err) {
        log('[users] fetch failed', err);
      }
    }
  }

  async function flush() {
    timer = undefined;
    const ids = [...pending];
    pending = new Set();
    const known = store.getState().users;
    const missing = ids.filter((id) => !known[id]);
    const cached = missing.length ? await cache.getMany<CachedUser>('users', missing) : [];
    if (stopped) return;
    merge(cached);
    const users = store.getState().users;
    const t = now();
    await fetchFresh(ids.filter((id) => !users[id] || t - users[id].fetched_at > STALE));
  }

  /** 声明要用到这些人；已有且没过期的什么都不做 */
  function want(ids: readonly number[]) {
    if (stopped) return;
    const t = now();
    const users = store.getState().users;
    for (const id of ids) {
      if (!(id > 0)) continue;
      const u = users[id];
      if (u && t - u.fetched_at <= STALE) continue;
      const at = handled.get(id);
      if (at !== undefined && t - at < RETRY) continue;
      handled.set(id, t);
      pending.add(id);
    }
    if (pending.size && !timer) timer = setTimeout(() => void flush().catch((err) => log('[users] flush failed', err)), BATCH_DELAY);
  }

  /** 马上重新取（如打开单聊时要最新的在线状态），不管有没有过期 */
  function refresh(ids: readonly number[]) {
    const fresh = ids.filter((id) => id > 0);
    if (stopped || fresh.length === 0) return;
    void fetchFresh(fresh);
  }

  /** line 推送：只改内存里的在线状态，不落缓存（下次取资料时以服务端为准） */
  function setOnline(userid: number, online: boolean) {
    const u = store.getState().users[userid];
    if (!u || u.online === online) return;
    store.setState((s) => ({ users: { ...s.users, [userid]: { ...u, online } } }));
  }

  /** 服务端推来或别处拿到的新资料，直接覆盖 */
  function put(list: readonly UserBasic[]) {
    if (stopped || list.length === 0) return;
    const at = now();
    const full = list.map((u) => ({ ...u, fetched_at: at }));
    merge(full);
    void cache.putMany('users', full).catch((err) => log('[users] persist failed', err));
  }

  function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
  }

  return { store, want, refresh, put, setOnline, stop };
}

export type UserDirectory = ReturnType<typeof createUserDirectory>;
