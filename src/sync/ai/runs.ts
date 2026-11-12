import { createStore } from 'zustand/vanilla';

import type { OpenSse } from '../stream/msgStreams';
import { isTerminal, PartsBuilder, phaseOf, type AiPart } from './protocol';

/** 进行中回复的实时内容 */
export interface LiveRun {
  parts: AiPart[];
  /** 事件流里的运行阶段（比消息推送及时）；还没有时为空 */
  phase: string;
}

/** 实时内容最快多久写一次（流式输出每个字都触发） */
const FLUSH_MS = 100;
/** 没收到任何事件就断开（网络切换等）时最多重试几次，每次多等一秒 */
const MAX_RETRIES = 3;
const RETRY_MS = 1000;

interface Entry {
  refs: number;
  builder: PartsBuilder;
  phase: string;
  /** 事件游标：断线、等待确认后从这里续传 */
  cursor: string;
  close: (() => void) | null;
  /** 正在取事件流地址 */
  starting: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  /** 连续没收到事件就断开的次数 */
  retries: number;
  retryTimer: ReturnType<typeof setTimeout> | undefined;
}

/**
 * 聊天机器人回复的 Run 事件流（对照主仓库 utils/ai-agent/run-watcher.js）：进行中的回复显示时订阅，
 * 事件归约成 parts 写进 live（消息 id → 实时内容）。订阅按引用计数，没人看时关掉；结束后以消息里保存的 parts 为准
 */
export function createAiRuns({ open, origin, eventsUrl, onSettled }: {
  open: OpenSse;
  /** 服务器地址（拼相对的事件地址） */
  origin: () => string;
  /** 回复的事件流地址（相对地址，带凭证）；已结束为 null */
  eventsUrl: (msgId: number) => Promise<string | null>;
  onSettled?: (msgId: number) => void;
}) {
  const live = createStore<Record<number, LiveRun>>()(() => ({}));
  const entries = new Map<number, Entry>();

  function flush(msgId: number, entry: Entry) {
    clearTimeout(entry.timer);
    entry.timer = undefined;
    if (entries.get(msgId) !== entry) return;
    live.setState({ [msgId]: { parts: entry.builder.parts.map((part) => ({ ...part })), phase: entry.phase } });
  }

  function connect(msgId: number, entry: Entry, url: string) {
    let received = 0;
    let terminal = false;
    const target = entry.cursor ? `${url}${url.includes('?') ? '&' : '?'}offset=${encodeURIComponent(entry.cursor)}` : url;
    entry.close = open(
      target,
      ({ data, id }) => {
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(data) as Record<string, unknown>;
        } catch {
          return;
        }
        if (id) entry.cursor = id;
        received++;
        entry.builder.apply(event);
        entry.phase = phaseOf(event) ?? entry.phase;
        if (isTerminal(event)) terminal = true;
        entry.timer ??= setTimeout(() => flush(msgId, entry), FLUSH_MS);
      },
      () => {
        if (entries.get(msgId) !== entry) return;
        entry.close = null;
        flush(msgId, entry);
        // 等待确认或连接中断：从游标续传；结束了就停。连着几次没有新事件（已结束、已过期）也停，最终内容由消息更新推送
        if (terminal) { onSettled?.(msgId); return; }
        if (received > 0) {
          entry.retries = 0;
          connect(msgId, entry, url);
        } else if (entry.retries < MAX_RETRIES) {
          entry.retries++;
          entry.retryTimer = setTimeout(() => connect(msgId, entry, url), RETRY_MS * entry.retries);
        } else { onSettled?.(msgId); }
      },
    );
  }

  async function start(msgId: number, entry: Entry) {
    if (entry.close || entry.starting) return;
    entry.starting = true;
    const path = await eventsUrl(msgId).catch(() => null);
    entry.starting = false;
    if (entries.get(msgId) !== entry) return;
    if (!path) { onSettled?.(msgId); return; }
    connect(msgId, entry, /^https?:\/\//i.test(path) ? path : `${origin().replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`);
  }

  /** 进行中的回复显示时调用，返回释放函数 */
  function watch(msgId: number) {
    let entry = entries.get(msgId);
    if (!entry) {
      entry = { refs: 0, builder: new PartsBuilder(), phase: '', cursor: '', close: null, starting: false, timer: undefined, retries: 0, retryTimer: undefined };
      entries.set(msgId, entry);
    }
    entry.refs++;
    void start(msgId, entry);
    const own = entry;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--own.refs === 0 && entries.get(msgId) === own) drop(msgId);
    };
  }

  /** 确认后：原连接已结束时重新订阅，新一段从游标接着来 */
  function resume(msgId: number) {
    const entry = entries.get(msgId);
    if (!entry) return;
    clearTimeout(entry.retryTimer);
    entry.retries = 0;
    void start(msgId, entry);
  }

  function drop(msgId: number) {
    const entry = entries.get(msgId);
    if (!entry) return;
    entries.delete(msgId);
    clearTimeout(entry.timer);
    clearTimeout(entry.retryTimer);
    entry.close?.();
    const { [msgId]: _, ...rest } = live.getState();
    live.setState(rest, true);
  }

  function stop() {
    for (const msgId of [...entries.keys()]) drop(msgId);
  }

  return { live, watch, resume, stop };
}
export type AiRuns = ReturnType<typeof createAiRuns>;
