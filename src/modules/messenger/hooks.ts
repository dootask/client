import { useEffect } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { createMessengerStore, type MessengerState, type StoredDialog } from '../../sync/messenger';
import type { CachedUser, UserDirectoryState } from '../../sync/users';
import { useMessengerInstance } from './service';

/** 未登录时给 hooks 用的空状态 */
const emptyStore = createMessengerStore();
const emptyUsers = createStore<UserDirectoryState>()(() => ({ users: {} }));

export const useMessenger = () => useMessengerInstance((s) => s.messenger);

/** 长按菜单里改动消息的操作（置顶、标注、待办、转发、翻译、转文字） */
export const useMsgActions = () => useMessengerInstance((s) => s.actions);

/** 订阅消息数据层的状态；selector 要返回稳定引用（或配合 useShallow） */
export function useMessengerState<T>(selector: (state: MessengerState) => T): T {
  const messenger = useMessenger();
  return useStore(messenger?.store ?? emptyStore, selector);
}

/** 一个会话；每行只订阅自己这一条 */
export function useDialog(id: number): StoredDialog | undefined {
  return useMessengerState((s) => s.dialogs[id]);
}

/** 一个用户的基础信息（昵称、头像）；没有时向用户目录要，取回后自动刷新 */
export function useUser(userid: number): CachedUser | undefined {
  const users = useMessengerInstance((s) => s.users);
  const user = useStore(users?.store ?? emptyUsers, (s) => (userid > 0 ? s.users[userid] : undefined));
  useEffect(() => {
    if (userid > 0) users?.want([userid]);
  }, [users, userid]);
  return user;
}

/** 一组用户（成员列表、已读名单）；整张表订阅，没有的向用户目录要 */
export function useUsers(userids: readonly number[]): Record<number, CachedUser> {
  const users = useMessengerInstance((s) => s.users);
  const all = useStore(users?.store ?? emptyUsers, (s) => s.users);
  useEffect(() => {
    if (userids.length) users?.want(userids);
  }, [users, userids]);
  return all;
}
