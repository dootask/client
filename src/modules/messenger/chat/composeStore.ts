import { useState, useSyncExternalStore } from 'react';

import { EMPTY_COMPOSE, type ComposeValue } from '../../../sync/messenger';

export interface Selection {
  start: number;
  end: number;
}

export interface ComposeState {
  value: ComposeValue;
  cursor: number;
  /** 程序改动文字后要放置的光标；输入框回报一次选区后交还给用户 */
  selection?: Selection;
}

/**
 * 输入栏内容放在页面状态之外：每次按键只重画订阅它的输入框与候选浮层，
 * 不连带整个会话页（导航栏、消息列表）重渲染，删除 @ 时整体删除的回写才跟得上按键
 */
export interface ComposeStore {
  get: () => ComposeState;
  set: (next: ComposeState) => void;
  subscribe: (listener: () => void) => () => void;
}

function createComposeStore(value: ComposeValue): ComposeStore {
  let state: ComposeState = { value, cursor: value.text.length };
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (next) => {
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** 一个会话页一个；initial 只在创建时取一次（草稿） */
export function useComposeStore(initial: () => ComposeValue = () => EMPTY_COMPOSE): ComposeStore {
  const [store] = useState(() => createComposeStore(initial()));
  return store;
}

export function useComposeState(store: ComposeStore): ComposeState {
  return useSyncExternalStore(store.subscribe, store.get);
}
