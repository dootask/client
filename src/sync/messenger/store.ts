import { createStore } from 'zustand/vanilla';

import type { Dialog, Msg } from '../api/dialog';

/** 本地给会话记录加的字段（只存在缓存里，服务端不返回，合并时自然保留） */
export interface LocalDialogFields {
  /** 缓存里这个会话最新一条消息的 id；缓存的消息从它往前是连续的。0 或缺失表示没缓存 */
  cached_msg_id?: number;
}
export type StoredDialog = Dialog & LocalDialogFields;

/** 一个会话在内存里的消息窗口：一段连续的消息，按 id 倒序 */
export interface MsgWindow {
  list: Msg[];
  /** 本次运行里已经和服务器对过最新一页；没对过之前显示的是缓存，不能往前翻 */
  synced: boolean;
  /** 正在加载的方向，界面显示加载中 */
  loading: 'latest' | 'earlier' | 'newer' | 'around' | null;
}

/** 发送队列里的消息（R18）：成功前在聊天窗口最新一端显示 */
export interface OutboxItem {
  /** 本地 id，界面当 key 用 */
  localId: string;
  dialog_id: number;
  /** HTML 文本 */
  text: string;
  reply_id?: number;
  /** 进队列的时间（毫秒） */
  queuedAt: number;
  /** sending：发送中或等网络恢复；failed：服务端拒绝或排队超过 24 小时，等用户重发或删除 */
  state: 'sending' | 'failed';
  /** 失败原因（服务端提示，可能为空）；界面兜底翻译 */
  error?: string;
}

export interface MessengerState {
  /** 已从缓存读出会话列表（冷启动先画缓存） */
  ready: boolean;
  /** 本次运行已和服务器同步过一次会话列表 */
  synced: boolean;
  dialogs: Record<number, StoredDialog>;
  windows: Record<number, MsgWindow>;
  /** 正在看的会话，0 为没有 */
  openId: number;
  /** 草稿（R19），会话 id → HTML */
  drafts: Record<number, string>;
  outbox: OutboxItem[];
}

export const initialMessengerState = (): MessengerState => ({
  ready: false,
  synced: false,
  dialogs: {},
  windows: {},
  openId: 0,
  drafts: {},
  outbox: [],
});

export const createMessengerStore = () => createStore<MessengerState>()(initialMessengerState);
export type MessengerStore = ReturnType<typeof createMessengerStore>;
