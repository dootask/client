import { createStore } from 'zustand/vanilla';

import type { Dialog, Msg } from '../api/dialog';
import type { LocalFile } from '../api/upload';

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
  /** HTML 文本；md 为真时是 Markdown 原文 */
  text: string;
  md?: boolean;
  reply_id?: number;
  /** 不提醒对方 */
  silence?: boolean;
  /** 进队列的时间（毫秒） */
  queuedAt: number;
  /** sending：发送中或等网络恢复；failed：服务端拒绝或排队超过 24 小时，等用户重发或删除 */
  state: 'sending' | 'failed';
  /** 失败原因（服务端提示，可能为空）；界面兜底翻译 */
  error?: string;
}

/** 发送中的文件（每个文件一条消息）：本地文件只在本次运行里有效，不存盘 */
export interface UploadItem {
  localId: string;
  dialog_id: number;
  reply_id?: number;
  file: LocalFile;
  /** 语音的时长（毫秒）：有它就是语音，走语音接口 */
  duration?: number;
  queuedAt: number;
  /** sending：排队或上传中；failed：等用户重发或删除 */
  state: 'sending' | 'failed';
  /** 服务端的提示，网络问题为空；界面兜底翻译 */
  error?: string;
  /** 跟在这个文件后面发的说明（HTML），文件发出或失败后发出 */
  caption?: string;
}

/** 自己刚撤回的文本消息（只在本地保留 5 分钟）：原位置显示「你撤回了一条消息」和「重新编辑」 */
export interface WithdrawnMsg {
  id: number;
  dialog_id: number;
  /** 原文：HTML 或 Markdown */
  text: string;
  md: boolean;
  /** 原消息的发送时间（占位按它排日期） */
  created_at: string;
  /** 撤回的时间（毫秒） */
  at: number;
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
  uploads: UploadItem[];
  /** 本次运行发出的消息 id → 发送时的本地 id，聊天列表用它认行，发送中换成发出的消息时行不重挂 */
  sentKeys: Record<number, string>;
  withdrawn: WithdrawnMsg[];
  /** 本次运行里翻译过的消息：消息 id → 译文（同旧前端，只在本地显示，隐藏即删掉） */
  translations: Record<number, Translation>;
  /** 正在转文字、翻译的消息 id，气泡上显示进行中 */
  busy: Record<number, 'voice2text' | 'translate'>;
  /** 查过的收藏状态（按消息 id），菜单据此显示「收藏」或「取消收藏」 */
  favorites: Record<number, boolean>;
}

export interface Translation {
  language: string;
  content: string;
}

export const initialMessengerState = (): MessengerState => ({
  ready: false,
  synced: false,
  dialogs: {},
  windows: {},
  openId: 0,
  drafts: {},
  outbox: [],
  uploads: [],
  sentKeys: {},
  withdrawn: [],
  translations: {},
  busy: {},
  favorites: {},
});

export const createMessengerStore = () => createStore<MessengerState>()(initialMessengerState);
export type MessengerStore = ReturnType<typeof createMessengerStore>;
