import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SseEvent } from '../stream/sse';
import { createAiRuns } from './runs';

interface Conn {
  url: string;
  emit: (event: object, id?: string) => void;
  end: () => void;
}

function setup() {
  const conns: Conn[] = [];
  const runs = createAiRuns({
    open: (url, onEvent: (event: SseEvent) => void, onEnd) => {
      conns.push({ url, emit: (event, id = '') => onEvent({ event: 'message', data: JSON.stringify(event), id }), end: onEnd });
      return () => {};
    },
    origin: () => 'https://s.example/',
    eventsUrl: () => Promise.resolve('ai/runs/r/events?token=x'),
  });
  return { runs, conns };
}

afterEach(() => vi.useRealTimers());

describe('createAiRuns', () => {
  it('事件写进 live，断线从游标续传，没有新事件时有限重试', async () => {
    vi.useFakeTimers();
    const { runs, conns } = setup();
    const release = runs.watch(7);
    await vi.runAllTimersAsync();
    expect(conns[0]!.url).toBe('https://s.example/ai/runs/r/events?token=x');

    conns[0]!.emit({ type: 'RUN_STARTED' }, 'c1');
    conns[0]!.emit({ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: '好' }, 'c2');
    await vi.advanceTimersByTimeAsync(100);
    expect(runs.live.getState()[7]).toEqual({ parts: [{ type: 'text', id: 'm', text: '好' }], phase: 'running' });

    conns[0]!.end();
    expect(conns[1]!.url).toBe('https://s.example/ai/runs/r/events?token=x&offset=c2');
    for (let i = 0; i < 3; i++) {
      conns[conns.length - 1]!.end();
      await vi.advanceTimersByTimeAsync(5000);
    }
    expect(conns).toHaveLength(5);
    conns[4]!.end();
    await vi.advanceTimersByTimeAsync(10000);
    expect(conns).toHaveLength(5);

    release();
    expect(runs.live.getState()[7]).toBeUndefined();
  });

  it('结束事件后不再续传', async () => {
    const { runs, conns } = setup();
    runs.watch(1);
    await Promise.resolve();
    await Promise.resolve();
    conns[0]!.emit({ type: 'RUN_FINISHED' }, 'c1');
    conns[0]!.end();
    expect(conns).toHaveLength(1);
  });
});
