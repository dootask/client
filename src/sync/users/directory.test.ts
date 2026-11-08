import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserBasic } from '../api/users';
import { memoryCache } from '../messenger/testing';
import { createUserDirectory } from './directory';

const user = (userid: number, nickname = `u${userid}`): UserBasic => ({ userid, nickname });

describe('用户目录', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup(t = { now: 1_000_000 }) {
    const cache = memoryCache();
    const fetchBasic = vi.fn(async (ids: readonly number[]) => ids.filter((id) => id !== 404).map((id) => user(id)));
    const dir = createUserDirectory({ fetchBasic, cache, now: () => t.now });
    return { cache, fetchBasic, dir, t };
  }

  it('攒批请求，超过 50 个拆开', async () => {
    const { fetchBasic, dir, cache } = setup();
    dir.want(Array.from({ length: 60 }, (_, i) => i + 1));
    dir.want([1, 2, 0, -1]);
    await vi.runAllTimersAsync();
    expect(fetchBasic).toHaveBeenCalledTimes(2);
    expect(fetchBasic.mock.calls[0]![0]).toHaveLength(50);
    expect(fetchBasic.mock.calls[1]![0]).toHaveLength(10);
    expect(dir.store.getState().users[60]?.nickname).toBe('u60');
    expect(cache.data.users!.size).toBe(60);
  });

  it('缓存里新鲜的不请求，过期的后台刷新', async () => {
    const { fetchBasic, dir, cache, t } = setup();
    await cache.putMany('users', [
      { ...user(1, 'cached'), fetched_at: t.now - 1000 },
      { ...user(2, 'old'), fetched_at: t.now - 2 * 3600_000 },
    ]);
    dir.want([1, 2]);
    await vi.runAllTimersAsync();
    expect(fetchBasic).toHaveBeenCalledTimes(1);
    expect(fetchBasic.mock.calls[0]![0]).toEqual([2]);
    expect(dir.store.getState().users[1]?.nickname).toBe('cached');
    expect(dir.store.getState().users[2]?.nickname).toBe('u2');
  });

  it('已有的不重复请求，取不到的隔一会儿才重试', async () => {
    const { fetchBasic, dir, t } = setup();
    dir.want([1, 404]);
    await vi.runAllTimersAsync();
    dir.want([1, 404]);
    await vi.runAllTimersAsync();
    expect(fetchBasic).toHaveBeenCalledTimes(1);
    t.now += 61_000;
    dir.want([1, 404]);
    await vi.runAllTimersAsync();
    expect(fetchBasic).toHaveBeenCalledTimes(2);
    expect(fetchBasic.mock.calls[1]![0]).toEqual([404]);
  });

  it('请求失败隔一会儿重试', async () => {
    const { fetchBasic, dir, t } = setup();
    fetchBasic.mockRejectedValueOnce(new Error('net'));
    dir.want([3]);
    await vi.runAllTimersAsync();
    dir.want([3]);
    await vi.runAllTimersAsync();
    expect(fetchBasic).toHaveBeenCalledTimes(1);
    t.now += 61_000;
    dir.want([3]);
    await vi.runAllTimersAsync();
    expect(dir.store.getState().users[3]?.nickname).toBe('u3');
  });

  it('停止后不再请求', async () => {
    const { fetchBasic, dir } = setup();
    dir.want([1]);
    dir.stop();
    await vi.runAllTimersAsync();
    expect(fetchBasic).not.toHaveBeenCalled();
  });
});
