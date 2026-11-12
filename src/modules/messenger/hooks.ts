import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createStore } from 'zustand/vanilla';

import type { AiInfo } from '../../sync/ai/protocol';
import type { LiveRun } from '../../sync/ai/runs';
import { isActive } from '../../sync/ai/timeline';
import type { Msg } from '../../sync/api/dialog';
import { createMessengerStore, type MessengerState, type StoredDialog } from '../../sync/messenger';
import type { CachedUser, UserDirectoryState } from '../../sync/users';
import { useMessengerInstance } from './service';

/** 未登录时给 hooks 用的空状态 */
const emptyStore = createMessengerStore();
const emptyUsers = createStore<UserDirectoryState>()(() => ({ users: {} }));
const emptyTexts = createStore<Record<number, string>>()(() => ({}));
const emptyRuns = createStore<Record<number, LiveRun>>()(() => ({}));

export const useMessenger = () => useMessengerInstance((s) => s.messenger);

/** 长按菜单里改动消息的操作（置顶、标注、待办、转发、翻译、转文字） */
export const useMsgActions = () => useMessengerInstance((s) => s.actions);

/** 群资料与成员管理（会话信息页、成员页、建群） */
export const useGroupActions = () => useMessengerInstance((s) => s.group);

/** 订阅消息数据层的状态；selector 要返回稳定引用（或配合 useShallow） */
export function useMessengerState<T>(selector: (state: MessengerState) => T): T {
  const messenger = useMessenger();
  return useStore(messenger?.store ?? emptyStore, selector);
}

/**
 * AI 回复生成中的实时内容叠加到消息上，服务端推来最终结果后用消息本身。只订阅这一条消息：
 * - 聊天机器人回复（msg.ai）进行中时订阅 Run 事件流，实时 parts 叠加为 msg.ai.live
 * - 旧式文本流（msgStream，H1）把正文换成已吐出的文字
 */
export function useStreamingMsg(msg: Msg): Msg {
  const streams = useMessengerInstance((s) => s.streams);
  const runs = useMessengerInstance((s) => s.runs);
  const text = useStore(streams?.texts ?? emptyTexts, (s) => s[msg.id]);
  const live = useStore(runs?.live ?? emptyRuns, (s) => s[msg.id]);
  const body = msg.msg && typeof msg.msg === 'object' ? (msg.msg as { text?: unknown; ai?: AiInfo }) : null;
  const ai = body?.ai && typeof body.ai === 'object' ? body.ai : null;
  const running = !!ai && isActive(ai.status);
  useEffect(() => (running && runs ? runs.watch(msg.id) : undefined), [running, runs, msg.id]);
  return useMemo(() => {
    if (!body) return msg;
    if (ai) return running && live ? { ...msg, msg: { ...body, ai: { ...ai, live } } } : msg;
    return text === undefined ? msg : { ...msg, msg: { ...body, text } };
  }, [msg, body, ai, running, live, text]);
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

/** 几个人的昵称（悬停提示）；只订阅这几个人，没有的向用户目录要，还没取回的是空串 */
export function useNicknames(userids: readonly number[]): string[] {
  const users = useMessengerInstance((s) => s.users);
  const names = useStore(users?.store ?? emptyUsers, useShallow((s) => userids.map((id) => s.users[id]?.nickname ?? '')));
  const key = userids.join(',');
  useEffect(() => {
    if (key) users?.want(key.split(',').map(Number));
  }, [users, key]);
  return names;
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
