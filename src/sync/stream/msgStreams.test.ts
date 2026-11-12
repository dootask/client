import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMsgStreams, type OpenSse } from './msgStreams';
import type { SseEvent } from './sse';

function setup() {
  const conns: { url: string; emit: (e: Partial<SseEvent>) => void; end: () => void; closed: boolean }[] = [];
  const open: OpenSse = (url, onEvent, onEnd) => {
    const conn = { url, emit: (e: Partial<SseEvent>) => onEvent({ event: 'message', data: '', id: '', ...e }), end: onEnd, closed: false };
    conns.push(conn);
    return () => {
      conn.closed = true;
    };
  };
  const streams = createMsgStreams({ open, origin: () => 'https://srv/', baseText: () => '...' });
  return { streams, conns };
}

const data = (content: string) => JSON.stringify({ content });

describe('createMsgStreams', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('拼服务器地址；同一地址不重复订阅', () => {
    const { streams, conns } = setup();
    streams.subscribe('/ai/stream/7/k1');
    streams.subscribe('/ai/stream/7/k1');
    expect(conns.map((c) => c.url)).toEqual(['https://srv/ai/stream/7/k1']);
  });

  it('replace 整段换掉，append 逐字吐出', () => {
    const { streams, conns } = setup();
    streams.subscribe('/ai/stream/7/k');
    conns[0]!.emit({ event: 'replace', data: data('思考') });
    vi.advanceTimersByTime(32);
    expect(streams.texts.getState()[7]).toBe('思考');
    conns[0]!.emit({ event: 'append', data: data('你好') });
    vi.advanceTimersByTime(32);
    expect(streams.texts.getState()[7]).toBe('思考你');
    vi.advanceTimersByTime(32);
    expect(streams.texts.getState()[7]).toBe('思考你好');
  });

  it('第一段是 append 时接在消息原文后面', () => {
    const { streams, conns } = setup();
    streams.subscribe('/ai/stream/7/k');
    conns[0]!.emit({ event: 'append', data: data('a') });
    vi.advanceTimersByTime(32);
    expect(streams.texts.getState()[7]).toBe('...a');
  });

  it('done 后关连接，吐完再留一阵后清掉', () => {
    const { streams, conns } = setup();
    streams.subscribe('/ai/stream/7/k');
    conns[0]!.emit({ event: 'append', data: data('ab') });
    conns[0]!.emit({ event: 'done', data: '{}' });
    expect(conns[0]!.closed).toBe(true);
    vi.advanceTimersByTime(64);
    expect(streams.texts.getState()[7]).toBe('...ab');
    vi.advanceTimersByTime(30_000);
    expect(streams.texts.getState()[7]).toBeUndefined();
  });

  it('坏数据忽略；超过 10 个关最早的', () => {
    const { streams, conns } = setup();
    streams.subscribe('/ai/stream/1/k');
    conns[0]!.emit({ event: 'append', data: 'oops' });
    vi.advanceTimersByTime(32);
    expect(streams.texts.getState()[1]).toBeUndefined();
    for (let i = 2; i <= 11; i++) streams.subscribe(`/ai/stream/${i}/k`);
    expect(conns[0]!.closed).toBe(true);
    expect(conns[1]!.closed).toBe(false);
  });

  it('stop 关掉全部', () => {
    const { streams, conns } = setup();
    streams.subscribe('/ai/stream/1/k');
    streams.stop();
    expect(conns[0]!.closed).toBe(true);
  });
});
