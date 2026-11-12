import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OpenSse } from '../stream/msgStreams';
import type { SseEvent } from '../stream/sse';
import { createAiRuns, type AiRuns } from './runs';

interface Conn {
  url: string;
  emit: (event: object, id?: string) => void;
  emitRaw: (data: string, id?: string) => void;
  end: () => void;
  close: ReturnType<typeof vi.fn>;
}

const activeRuns: AiRuns[] = [];

function setup(withOnSettled = true) {
  const conns: Conn[] = [];
  const eventsUrl = vi.fn((_msgId: number): Promise<string | null> => Promise.resolve('ai/runs/r/events?token=x'));
  const onSettled = vi.fn<(msgId: number) => void>();
  const open = vi.fn<OpenSse>((url, onEvent: (event: SseEvent) => void, onEnd) => {
    const emitRaw = (data: string, id = '') => onEvent({ event: 'message', data, id });
    // 关闭时也可能收到 onEnd，必须与真正结束的连接区分。
    const close = vi.fn(() => onEnd());
    conns.push({ url, emit: (event, id = '') => emitRaw(JSON.stringify(event), id), emitRaw, end: onEnd, close });
    return close;
  });
  const runs = createAiRuns({
    open, origin: () => 'https://s.example/', eventsUrl,
    ...(withOnSettled ? { onSettled } : {}),
  });
  activeRuns.push(runs);
  return { runs, conns, eventsUrl, onSettled, open };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  for (const runs of activeRuns.splice(0)) runs.stop();
  vi.useRealTimers();
});

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
    const { runs, conns, onSettled } = setup();
    runs.watch(1);
    await Promise.resolve();
    await Promise.resolve();
    conns[0]!.emit({ type: 'RUN_FINISHED' }, 'c1');
    conns[0]!.end();
    expect(conns).toHaveLength(1);
    expect(onSettled).toHaveBeenCalledExactlyOnceWith(1);
  });

  it.each([
    { type: 'RUN_FINISHED' },
    { type: 'RUN_FINISHED', outcome: { type: 'success' } },
    { type: 'RUN_ERROR', code: 'server_error' },
    { type: 'RUN_ERROR', code: 'cancelled' },
  ])('终态 %j 在连接结束时 flush 最后正文并回调消息 id，不再重连', async (terminal) => {
    const { runs, conns, onSettled } = setup();
    runs.watch(7);
    await vi.advanceTimersByTimeAsync(0);
    expect(onSettled).not.toHaveBeenCalled();
    conns[0]!.emit({ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: '最后正文' });
    conns[0]!.emit(terminal, 'last');
    expect(onSettled).not.toHaveBeenCalled();
    expect(runs.live.getState()[7]).toBeUndefined();
    onSettled.mockImplementation((msgId) => {
      expect(runs.live.getState()[msgId]?.parts).toEqual([{ type: 'text', id: 'm', text: '最后正文' }]);
    });
    conns[0]!.end();
    expect(onSettled).toHaveBeenCalledExactlyOnceWith(7);
    await vi.runAllTimersAsync();
    expect(conns).toHaveLength(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
    runs.stop();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('等待确认的 RUN_FINISHED 不算终态，恢复完成后才回调', async () => {
    const { runs, conns, onSettled } = setup();
    runs.watch(7);
    await vi.advanceTimersByTimeAsync(0);
    conns[0]!.emit({
      type: 'RUN_FINISHED', outcome: { type: 'interrupt', interrupts: [{ id: 'confirm', reason: 'confirmation', message: '继续？' }] },
    }, 'cursor');
    conns[0]!.end();
    expect(onSettled).not.toHaveBeenCalled();
    expect(conns).toHaveLength(2);
    expect(conns[1]!.url).toBe('https://s.example/ai/runs/r/events?token=x&offset=cursor');
    expect(runs.live.getState()[7]?.phase).toBe('waiting_confirm');
    conns[1]!.emit({ type: 'RUN_STARTED', input: { resume: [{ interruptId: 'confirm', payload: { approved: true } }] } });
    await vi.advanceTimersByTimeAsync(100);
    expect(runs.live.getState()[7]?.phase).toBe('running');
    expect(onSettled).not.toHaveBeenCalled();
    conns[1]!.emit({ type: 'RUN_FINISHED' });
    conns[1]!.end();
    expect(onSettled).toHaveBeenCalledExactlyOnceWith(7);
    await vi.runAllTimersAsync();
    expect(conns).toHaveLength(2);
  });

  it('一次没有事件的断线不立即回调，分别等待 1/2/3 秒，耗尽三次重试才回调', async () => {
    const { runs, conns, onSettled, eventsUrl } = setup();
    runs.watch(7);
    await vi.advanceTimersByTimeAsync(0);
    for (let retry = 1; retry <= 3; retry++) {
      conns[retry - 1]!.end();
      expect(onSettled).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(retry * 1000 - 1);
      expect(conns).toHaveLength(retry);
      await vi.advanceTimersByTimeAsync(1);
      expect(conns).toHaveLength(retry + 1);
      expect(onSettled).not.toHaveBeenCalled();
    }
    conns[3]!.end();
    expect(onSettled).toHaveBeenCalledExactlyOnceWith(7);
    await vi.runAllTimersAsync();
    expect(conns).toHaveLength(4);
    expect(eventsUrl).toHaveBeenCalledExactlyOnceWith(7);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('收到非终态事件后断线立即续传并重置无事件重试次数，不回调', async () => {
    const { runs, conns, onSettled } = setup();
    runs.watch(7);
    await vi.advanceTimersByTimeAsync(0);
    conns[0]!.end();
    await vi.advanceTimersByTimeAsync(1000);
    conns[1]!.emit({ type: 'RUN_STARTED' }, 'a/b ?');
    conns[1]!.end();
    expect(conns).toHaveLength(3);
    expect(conns[2]!.url).toBe('https://s.example/ai/runs/r/events?token=x&offset=a%2Fb%20%3F');
    expect(onSettled).not.toHaveBeenCalled();
    conns[2]!.end();
    await vi.advanceTimersByTimeAsync(999);
    expect(conns).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(conns).toHaveLength(4);
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('坏 JSON 不算收到有效事件，不更新游标，也不提前回调', async () => {
    const { runs, conns, onSettled } = setup();
    runs.watch(7);
    await vi.advanceTimersByTimeAsync(0);
    conns[0]!.emitRaw('{invalid', 'bad-cursor');
    conns[0]!.end();
    expect(conns).toHaveLength(1);
    expect(onSettled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(conns).toHaveLength(2);
    expect(conns[1]!.url).toBe(conns[0]!.url);
  });

  it.each([null, ''])('事件 URL 为 %s 时回调但不建立连接或重试', async (path) => {
    const { runs, conns, eventsUrl, onSettled, open } = setup();
    eventsUrl.mockResolvedValue(path);
    runs.watch(7);
    expect(onSettled).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(eventsUrl).toHaveBeenCalledExactlyOnceWith(7);
    expect(onSettled).toHaveBeenCalledExactlyOnceWith(7);
    expect(open).not.toHaveBeenCalled();
    expect(conns).toHaveLength(0);
    runs.stop();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('事件 URL 查询拒绝时按无 URL 回调，没有未处理的拒绝', async () => {
    const { runs, eventsUrl, onSettled, open } = setup();
    eventsUrl.mockRejectedValue(new Error('network'));
    runs.watch(7);
    await vi.runAllTimersAsync();
    expect(onSettled).toHaveBeenCalledExactlyOnceWith(7);
    expect(open).not.toHaveBeenCalled();
  });

  it('同一消息多个观看者共享请求和连接，只回调一次；不同消息分别回调', async () => {
    const { runs, conns, onSettled, eventsUrl } = setup();
    const release1 = runs.watch(7);
    const release2 = runs.watch(7);
    runs.watch(8);
    await vi.advanceTimersByTimeAsync(0);
    expect(eventsUrl.mock.calls).toEqual([[7], [8]]);
    expect(conns).toHaveLength(2);
    release1();
    release1();
    expect(conns[0]!.close).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
    conns[0]!.emit({ type: 'RUN_FINISHED' });
    conns[0]!.end();
    conns[1]!.emit({ type: 'RUN_ERROR' });
    conns[1]!.end();
    expect(onSettled.mock.calls).toEqual([[7], [8]]);
    release2();
    expect(runs.live.getState()[7]).toBeUndefined();
    expect(onSettled.mock.calls).toEqual([[7], [8]]);
  });

  it('resume 清掉等待中的重试，从游标重连，最终结束才回调', async () => {
    const { runs, conns, onSettled, eventsUrl } = setup();
    runs.watch(7);
    await vi.advanceTimersByTimeAsync(0);
    conns[0]!.emit({ type: 'RUN_STARTED' }, 'cursor');
    conns[0]!.end();
    conns[1]!.end();
    runs.resume(7);
    await vi.advanceTimersByTimeAsync(0);
    expect(conns).toHaveLength(3);
    expect(conns[2]!.url).toContain('&offset=cursor');
    expect(eventsUrl).toHaveBeenCalledTimes(2);
    expect(onSettled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    expect(conns).toHaveLength(3);
    conns[2]!.emit({ type: 'RUN_FINISHED' });
    conns[2]!.end();
    expect(onSettled).toHaveBeenCalledExactlyOnceWith(7);
  });

  it.each(['terminal', 'no-events', 'no-url'] as const)('onSettled 可省略：%s 路径兼容原有调用', async (mode) => {
    const { runs, conns, eventsUrl, onSettled } = setup(false);
    if (mode === 'no-url') eventsUrl.mockResolvedValue(null);
    runs.watch(7);
    await vi.advanceTimersByTimeAsync(0);
    if (mode === 'terminal') {
      conns[0]!.emit({ type: 'RUN_FINISHED' });
      expect(() => conns[0]!.end()).not.toThrow();
    } else if (mode === 'no-events') {
      for (let i = 0; i < 4; i++) {
        expect(() => conns[i]!.end()).not.toThrow();
        await vi.runAllTimersAsync();
      }
    }
    expect(onSettled).not.toHaveBeenCalled();
    expect(conns).toHaveLength(mode === 'no-url' ? 0 : mode === 'terminal' ? 1 : 4);
  });
});

describe('createAiRuns 停止不回调 onSettled', () => {
  it.each(['stop', 'release'] as const)('%s 主动关闭连接（即使收到终态但尚未结束）不回调，迟到的 onEnd 也忽略', async (action) => {
    const { runs, conns, onSettled } = setup();
    const release = runs.watch(7);
    await vi.advanceTimersByTimeAsync(0);
    conns[0]!.emit({ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: '答案' });
    await vi.advanceTimersByTimeAsync(100);
    expect(runs.live.getState()[7]?.parts).toHaveLength(1);
    conns[0]!.emit({ type: 'RUN_FINISHED' });
    if (action === 'stop') runs.stop();
    else release();
    expect(conns[0]!.close).toHaveBeenCalledTimes(1);
    expect(runs.live.getState()).toEqual({});
    expect(onSettled).not.toHaveBeenCalled();
    conns[0]!.end();
    await vi.runAllTimersAsync();
    expect(conns).toHaveLength(1);
    expect(onSettled).not.toHaveBeenCalled();
  });

  it.each(['stop', 'release'] as const)('%s 清掉无事件重试计时器，不重连或回调', async (action) => {
    const { runs, conns, onSettled } = setup();
    const release = runs.watch(7);
    await vi.advanceTimersByTimeAsync(0);
    conns[0]!.end();
    expect(vi.getTimerCount()).toBe(1);
    if (action === 'stop') runs.stop();
    else release();
    await vi.runAllTimersAsync();
    expect(conns).toHaveLength(1);
    expect(runs.live.getState()).toEqual({});
    expect(onSettled).not.toHaveBeenCalled();
  });

  it.each([
    ['stop', 'url'], ['stop', 'null'], ['stop', 'error'],
    ['release', 'url'], ['release', 'null'], ['release', 'error'],
  ] as const)('%s 后迟到的 URL 查询结果 %s 不连接或回调', async (action, result) => {
    const { runs, eventsUrl, onSettled, open } = setup();
    let resolve!: (path: string | null) => void;
    let reject!: (error: Error) => void;
    eventsUrl.mockReturnValue(new Promise<string | null>((yes, no) => { resolve = yes; reject = no; }));
    const release = runs.watch(7);
    if (action === 'stop') runs.stop();
    else release();
    if (result === 'error') reject(new Error('network'));
    else resolve(result === 'url' ? '/events' : null);
    await vi.runAllTimersAsync();
    expect(open).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
    expect(runs.live.getState()).toEqual({});
    runs.resume(7);
    await vi.runAllTimersAsync();
    expect(eventsUrl).toHaveBeenCalledTimes(1);
  });

  it('最后一个观看者释放才关闭连接，重复释放与重复 stop 不回调', async () => {
    const { runs, conns, onSettled } = setup();
    const release1 = runs.watch(7);
    const release2 = runs.watch(7);
    await vi.advanceTimersByTimeAsync(0);
    release1();
    release1();
    expect(conns[0]!.close).not.toHaveBeenCalled();
    release2();
    release2();
    runs.stop();
    runs.stop();
    expect(conns[0]!.close).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('stop 后重订阅同一消息，旧 release 不应关闭新连接或阻止新 onSettled', async () => {
    const { runs, conns, onSettled } = setup();
    const oldRelease = runs.watch(7);
    await vi.advanceTimersByTimeAsync(0);
    runs.stop();
    expect(onSettled).not.toHaveBeenCalled();
    const newRelease = runs.watch(7);
    await vi.advanceTimersByTimeAsync(0);
    expect(conns).toHaveLength(2);
    oldRelease();
    expect(conns[1]!.close).not.toHaveBeenCalled();
    conns[1]!.emit({ type: 'RUN_FINISHED' });
    conns[1]!.end();
    expect(onSettled).toHaveBeenCalledExactlyOnceWith(7);
    newRelease();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('stop 关闭所有消息的连接并取消未 flush 的正文，不把停止误当成完成', async () => {
    const { runs, conns, onSettled } = setup();
    runs.watch(7);
    runs.watch(8);
    await vi.advanceTimersByTimeAsync(0);
    for (const conn of conns) conn.emit({ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: '正文' });
    runs.stop();
    await vi.runAllTimersAsync();
    expect(conns.every(({ close }) => close.mock.calls.length === 1)).toBe(true);
    expect(conns).toHaveLength(2);
    expect(runs.live.getState()).toEqual({});
    expect(onSettled).not.toHaveBeenCalled();
  });
});
