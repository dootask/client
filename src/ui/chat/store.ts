import { useSyncExternalStore } from 'react';

/**
 * 极简外部状态。列表行组件按需订阅，状态变化只重绘订阅者，
 * 不改变传给列表的 props 引用（否则所有可见行都会重绘）。
 */
export interface Store<S> {
  get: () => S;
  set: (next: S) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createStore<S>(initial: S): Store<S> {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (next) => {
      if (Object.is(next, current)) return;
      current = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<S, R>(store: Store<S>, select: (state: S) => R): R {
  return useSyncExternalStore(store.subscribe, () => select(store.get()));
}
