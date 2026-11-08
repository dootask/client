import { useSyncExternalStore } from 'react';

const MINUTE = 60_000;

/**
 * 列表用的时钟，按分钟走，有人订阅时才计时。渲染里不直接读 Date.now()：
 * 会话列表的过滤（过期的项目、任务群）按分钟刷新，行里的时间只在跨天时重画
 */
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((fn) => fn());
    }, MINUTE);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) clearInterval(timer);
  };
}

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** 当前分钟（毫秒） */
export const useNow = () => useSyncExternalStore(subscribe, () => now);

/** 今天零点（毫秒），只在跨天时变 */
export const useToday = () => useSyncExternalStore(subscribe, () => startOfDay(now));
