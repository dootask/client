import { z } from 'zod';

import type { ApiClient } from './client';
import { phpList, requestParsed } from './schema';

/**
 * 会话、消息接口（主仓库 DialogController）。
 * 时间字段是服务器时区的 `YYYY-MM-DD HH:mm:ss` 字符串，同格式可直接按字符串比较先后；
 * user_ms 是毫秒时间戳，用来判断两份会话数据里用户态（未读、@）谁更新。
 */

const num = z.number();
const str = z.string();

/** 会话列表里的「最后一条消息」：列表接口给的是 type=preview 的摘要，推送更新时是完整消息 */
export const lastMsgSchema = z.looseObject({
  id: num,
  type: str,
  userid: num.optional(),
  msg: z.unknown(),
  created_at: str.optional(),
});
export type LastMsg = z.output<typeof lastMsgSchema>;

/** 项目、任务群的关联信息，列表过滤规则要用 */
export const groupInfoSchema = z.looseObject({
  name: str.nullish(),
  complete_at: str.nullish(),
  archived_at: str.nullish(),
  deleted_at: str.nullish(),
});

/** synthesizeData 合成的会话。只校验用到的字段，其余原样保留 */
export const dialogSchema = z.looseObject({
  id: num,
  type: str,
  group_type: str.nullish(),
  session_id: num.nullish(),
  name: str.optional(),
  avatar: str.nullish(),
  owner_id: num.nullish(),
  top_msg_id: num.nullish(),
  top_userid: num.nullish(),
  top_at: str.nullish(),
  last_at: str.nullish(),
  mark_unread: num.nullish(),
  silence: num.nullish(),
  hide: num.nullish(),
  color: str.nullish(),
  user_at: str.nullish(),
  user_ms: num.nullish(),
  unread: num.nullish(),
  unread_one: num.nullish(),
  mention: num.nullish(),
  mention_ids: phpList(num).optional(),
  people: num.nullish(),
  todo_num: num.nullish(),
  last_msg: lastMsgSchema.nullish(),
  pinyin: str.nullish(),
  group_info: groupInfoSchema.nullish(),
  bot: num.nullish(),
  /** 单聊的对方（userid 为 0 时是和自己的会话，服务端已换成自己） */
  dialog_user: z.looseObject({ userid: num }).nullish(),
  email: str.nullish(),
  userimg: str.nullish(),
  dialog_delete: num.nullish(),
});
export type Dialog = z.output<typeof dialogSchema>;

/** 消息。msg 的结构随 type 变化，渲染层再按类型解析 */
export const msgSchema = z.looseObject({
  id: num,
  dialog_id: num,
  userid: num,
  type: str,
  mtype: str.nullish(),
  msg: z.unknown(),
  created_at: str,
  read_at: str.nullish(),
  mention: num.nullish(),
  dot: num.nullish(),
  reply_id: num.nullish(),
  link: num.nullish(),
  /** 只在一页的两端有值：最新一条的 next_id 是更新一条的 id，最旧一条的 prev_id 是更早一条的 id；0 表示到头 */
  next_id: num.optional(),
  prev_id: num.optional(),
});
export type Msg = z.output<typeof msgSchema>;

/** 未读相关字段：已读上报、取未读、标记已读未读都返回它 */
export const unreadSchema = z.looseObject({
  id: num,
  unread: num,
  unread_one: num,
  mention: num,
  mention_ids: phpList(num),
  user_at: str,
  user_ms: num,
  mark_unread: num.optional(),
});
export type UnreadData = z.output<typeof unreadSchema>;

const listsSchema = z.looseObject({
  current_page: num,
  last_page: num,
  data: phpList(dialogSchema),
  deleted_id: phpList(num).optional(),
});

/** 会话列表一页。timerange 为上次同步的「更新时间,删除时间」（秒），首页会带上期间删除的会话 id */
export async function lists(client: ApiClient, params: { page: number; pagesize: number; timerange?: string }) {
  const { data } = await requestParsed(client, 'dialog/lists', listsSchema, { data: params });
  return data;
}

/** 列表外（更早）的未读会话和待办会话：last_at 早于给定时间（时间字符串或秒）的 */
export async function beyond(client: ApiClient, params: { unread_at: string | number; todo_at: string | number }) {
  const { data } = await requestParsed(client, 'dialog/beyond', phpList(dialogSchema), { data: params });
  return data;
}

/** 搜索结果里的联系人：还没有单聊时 id 是 `u:<userid>` */
const searchItemSchema = dialogSchema.extend({
  id: z.union([num, str]),
  /** 按消息内容搜到的那条 */
  search_msg_id: num.nullish(),
  dialog_user: z.looseObject({ userid: num }).nullish(),
});
export type SearchItem = z.output<typeof searchItemSchema>;

/** 搜索：先会话名，不够 20 个再补联系人，再补消息内容 */
export async function search(client: ApiClient, key: string) {
  const { data } = await requestParsed(client, 'dialog/search', phpList(searchItemSchema), { data: { key } });
  return data;
}

/** 最近 50 条被标注的消息，每条一行：会话信息 + 那条消息（last_msg、search_msg_id） */
export async function searchTag(client: ApiClient) {
  const { data } = await requestParsed(client, 'dialog/search/tag', phpList(dialogSchema.extend({ search_msg_id: num })));
  return data;
}

/** 打开（没有时创建）和某人的单聊 */
export async function openUser(client: ApiClient, userid: number) {
  const { data } = await requestParsed(client, 'dialog/open/user', dialogSchema, { data: { userid } });
  return data;
}

export async function one(client: ApiClient, dialogId: number) {
  const { data } = await requestParsed(client, 'dialog/one', dialogSchema, { data: { dialog_id: dialogId } });
  return data;
}

const msgListSchema = z.looseObject({
  list: phpList(msgSchema),
  /** 服务器处理请求的时间（秒） */
  time: num,
  /** 只在取最新一页时返回 */
  dialog: dialogSchema.nullish(),
});

export interface MsgListParams {
  dialog_id: number;
  /** 回复线程：只取回复这条的消息 */
  msg_id?: number;
  /** 以这条为中心取一页 */
  position_id?: number;
  /** 取 id ≤ prev_id 的一页（往更早翻） */
  prev_id?: number;
  /** 取 id ≥ next_id 的一页（往更新翻） */
  next_id?: number;
  msg_type?: 'tag' | 'todo' | 'link' | 'text' | 'image' | 'file' | 'record' | 'meeting';
  take?: number;
}

/** 消息分页，按 id 倒序。副作用：服务端清掉该会话的「标记未读」 */
export async function msgList(client: ApiClient, params: MsgListParams) {
  const { data } = await requestParsed(client, 'dialog/msg/list', msgListSchema, { data: { ...params } });
  return data;
}

/** 每个会话 latest_id 之后的最新消息（每次最多 5 个会话，每个最多 take 条，按 id 倒序） */
export async function msgLatest(client: ApiClient, dialogs: { id: number; latest_id: number }[], take: number) {
  const { data } = await requestParsed(client, 'dialog/msg/latest', z.looseObject({ data: phpList(msgSchema) }), {
    method: 'post',
    data: { dialogs, take },
  });
  return data.data;
}

/**
 * 已读上报：键是消息 id，值是会话 id 时服务端把该会话里 id ≥ 它的消息一起标已读，值是 0 只标这一条
 */
export async function msgRead(client: ApiClient, ids: Record<number, number>) {
  const { data } = await requestParsed(client, 'dialog/msg/read', phpList(unreadSchema), { method: 'post', data: { id: ids } });
  return data;
}

export async function msgUnread(client: ApiClient, dialogId: number) {
  const { data } = await requestParsed(client, 'dialog/msg/unread', unreadSchema, { data: { dialog_id: dialogId } });
  return data;
}

/** 标记已读（after_msg_id 起，省略为全部）或标记未读 */
export async function msgMark(client: ApiClient, params: { dialog_id: number; type: 'read' | 'unread'; after_msg_id?: number }) {
  const { data } = await requestParsed(client, 'dialog/msg/mark', unreadSchema, { data: params });
  return data;
}

/** 清除语音消息的未播放红点 */
export async function msgDot(client: ApiClient, msgId: number) {
  await client.request('dialog/msg/dot', { data: { id: msgId } });
}

/** 切换置顶，返回新的 top_at（取消时为 null） */
export async function top(client: ApiClient, dialogId: number) {
  const { data } = await requestParsed(client, 'dialog/top', z.looseObject({ id: num, top_at: str.nullable() }), { data: { dialog_id: dialogId } });
  return data;
}

/** 不显示该会话（置顶的不能隐藏），有新消息时自动重新显示 */
export async function hide(client: ApiClient, dialogId: number) {
  await client.request('dialog/hide', { data: { dialog_id: dialogId } });
}

/** 设置或取消免打扰（只有单聊和个人群可以） */
export async function silence(client: ApiClient, dialogId: number, on: boolean) {
  const { data } = await requestParsed(client, 'dialog/msg/silence', z.looseObject({ id: num, silence: num }), {
    data: { dialog_id: dialogId, type: on ? 'set' : 'cancel' },
  });
  return data;
}

/** 会话颜色标记，空串为取消 */
export async function color(client: ApiClient, dialogId: number, value: string) {
  const { data } = await requestParsed(client, 'dialog/msg/color', z.looseObject({ id: num, color: str }), {
    data: { dialog_id: dialogId, color: value },
  });
  return data;
}

export interface SendTextParams {
  dialog_id: number;
  /** HTML 文本 */
  text: string;
  reply_id?: number;
  /** 编辑这条消息 */
  update_id?: number;
  silence?: boolean;
}

/** 发送文本，返回服务器上的消息 */
export async function sendText(client: ApiClient, params: SendTextParams) {
  const { data } = await requestParsed(client, 'dialog/msg/sendtext', msgSchema, {
    method: 'post',
    data: {
      dialog_id: params.dialog_id,
      text: params.text,
      reply_id: params.reply_id,
      update_id: params.update_id,
      silence: params.silence ? 'yes' : undefined,
    },
  });
  return data;
}

/** 撤回自己的消息（超过系统设置的时限会被拒绝）；成功后服务端推送 delete */
export async function withdraw(client: ApiClient, msgId: number) {
  await client.request('dialog/msg/withdraw', { data: { msg_id: msgId } });
}

export const emojiItemSchema = z.looseObject({ symbol: str, userids: phpList(num) });

/** 表情回应：自己点过的取消，没点过的加上；返回这条消息新的回应列表 */
export async function emoji(client: ApiClient, msgId: number, symbol: string) {
  const { data } = await requestParsed(client, 'dialog/msg/emoji', z.looseObject({ id: num, emoji: phpList(emojiItemSchema) }), { data: { msg_id: msgId, symbol } });
  return data;
}
