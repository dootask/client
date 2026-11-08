import { useSyncExternalStore } from 'react';

import { kv, KV_KEYS } from '../../sync/storage';
import { ENTER_SEND_DEFAULT } from './enterSendDefault';

/**
 * 输入消息时 Enter 的作用：直接发送，或者换行（另用按钮 / 组合键发送）。
 * 只存在本机，没设过时按平台默认：App 上换行、Web 和桌面上发送
 */

const listeners = new Set<() => void>();

function read(): boolean {
  const value = kv.getString(KV_KEYS.enterSend);
  return value === undefined ? ENTER_SEND_DEFAULT : value === '1';
}

let current = read();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEnterSend(): boolean {
  return useSyncExternalStore(subscribe, () => current);
}

export function changeEnterSend(value: boolean): void {
  kv.set(KV_KEYS.enterSend, value ? '1' : '0');
  current = value;
  listeners.forEach((listener) => listener());
}
