import { useStore } from 'zustand';

import { createMessengerStore, type MessengerState } from '../../sync/messenger';
import { useMessengerInstance } from './service';

/** 未登录时给 hooks 用的空状态 */
const emptyStore = createMessengerStore();

export const useMessenger = () => useMessengerInstance((s) => s.messenger);

/** 订阅消息数据层的状态；selector 要返回稳定引用（或配合 useShallow） */
export function useMessengerState<T>(selector: (state: MessengerState) => T): T {
  const messenger = useMessenger();
  return useStore(messenger?.store ?? emptyStore, selector);
}
