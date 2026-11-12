import { createStore } from 'zustand/vanilla';

import type { SseEvent } from './sse';

/** 打开一个 SSE 连接：事件逐条交给 onEvent，连接断了调 onEnd；返回关闭函数。各端实现见 platform/sse */
export type OpenSse = (url: string, onEvent: (event: SseEvent) => void, onEnd: () => void) => () => void;

/** 同时订阅的上限，多了关最早的（同旧版） */
const MAX_STREAMS = 10;
/** 打字机一轮的间隔 */
const TICK_MS = 32;
/** 结束后流式文字再留一会儿，等服务端推最终结果（update）把消息换掉 */
const KEEP_AFTER_DONE_MS = 30_000;

/** 按排队的字数决定一轮吐几个字：少时逐字，多时加快追上（同旧版的分档，按本端更长的一轮放大） */
function batchSize(queued: number) {
  if (queued <= 5) return 1;
  if (queued <= 20) return 3;
  if (queued <= 50) return 8;
  return 16;
}

interface Op {
  type: 'append' | 'replace';
  text: string;
}

interface Stream {
  url: string;
  close: () => void;
  /** 已吐出的文字（还没有任何事件时为 undefined，界面显示消息本身） */
  text: string | undefined;
  queue: Op[];
  done: boolean;
}

/**
 * AI 回复的流式文字（H1，协议见 docs/spec-ai-stream.md）：收到 msgStream 推送后订阅 SSE，
 * append 拆成单字排队、replace 清队换整段，按打字机节奏写进 texts（消息 id → 当前文字）。
 * 流式文字单独一个 store，只有那条消息订阅；最终结果以服务端推的消息更新为准，不改消息数据
 */
export function createMsgStreams({ open, origin, baseText }: {
  open: OpenSse;
  /** 服务器地址（拼相对的 stream_url） */
  origin: () => string;
  /** 消息现在的文字：第一段是 append 时接在它后面 */
  baseText: (msgId: number) => string | undefined;
}) {
  const texts = createStore<Record<number, string>>()(() => ({}));
  const streams = new Map<number, Stream>();
  const order: number[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let ticker: ReturnType<typeof setInterval> | undefined;

  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);
    timers.add(timer);
  };

  function drop(msgId: number) {
    const s = streams.get(msgId);
    if (!s) return;
    s.close();
    streams.delete(msgId);
    order.splice(order.indexOf(msgId), 1);
    const { [msgId]: _, ...rest } = texts.getState();
    texts.setState(rest, true);
  }

  function tick() {
    const updates: Record<number, string> = {};
    for (const [msgId, s] of streams) {
      if (!s.queue.length) continue;
      let text = s.text ?? baseText(msgId) ?? '';
      for (const op of s.queue.splice(0, batchSize(s.queue.length))) text = op.type === 'replace' ? op.text : text + op.text;
      s.text = text;
      updates[msgId] = text;
      if (s.done && !s.queue.length) later(() => streams.get(msgId) === s && drop(msgId), KEEP_AFTER_DONE_MS);
    }
    if (Object.keys(updates).length) texts.setState(updates);
    if (![...streams.values()].some((s) => s.queue.length)) {
      clearInterval(ticker);
      ticker = undefined;
    }
  }

  function onEvent(s: Stream, msgId: number, { event, data }: SseEvent) {
    if (event === 'done') {
      s.done = true;
      s.close();
      if (!s.queue.length) later(() => streams.get(msgId) === s && drop(msgId), KEEP_AFTER_DONE_MS);
      return;
    }
    if (event !== 'append' && event !== 'replace') return;
    let content: unknown;
    try {
      content = (JSON.parse(data) as { content?: unknown }).content;
    } catch {
      return;
    }
    if (typeof content !== 'string') return;
    if (event === 'replace') s.queue = [{ type: 'replace', text: content }];
    else s.queue.push(...Array.from(content, (ch) => ({ type: 'append' as const, text: ch })));
    ticker ??= setInterval(tick, TICK_MS);
  }

  /** 收到 msgStream 推送：stream_url 形如 /ai/stream/{消息 id}/{key} */
  function subscribe(streamUrl: string) {
    const msgId = Number(/\/stream\/(\d+)/.exec(streamUrl)?.[1]) || 0;
    if (!msgId || streams.get(msgId)?.url === streamUrl) return;
    drop(msgId);
    const url = /^https?:\/\//i.test(streamUrl) ? streamUrl : `${origin().replace(/\/+$/, '')}/${streamUrl.replace(/^\/+/, '')}`;
    const s: Stream = { url: streamUrl, close: () => {}, text: undefined, queue: [], done: false };
    streams.set(msgId, s);
    order.push(msgId);
    if (order.length > MAX_STREAMS) drop(order[0]!);
    s.close = open(
      url,
      (event) => onEvent(s, msgId, event),
      () => {
        if (!s.done) onEvent(s, msgId, { event: 'done', data: '', id: '' });
      },
    );
  }

  function stop() {
    for (const msgId of [...streams.keys()]) drop(msgId);
    clearInterval(ticker);
    ticker = undefined;
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
  }

  return { texts, subscribe, stop };
}
export type MsgStreams = ReturnType<typeof createMsgStreams>;
