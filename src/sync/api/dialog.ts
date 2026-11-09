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
  /** 项目群是项目 id，任务群是任务 id */
  id: num.nullish(),
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
  /** HTML 文本；md 为真时是 Markdown 原文 */
  text: string;
  md?: boolean;
  reply_id?: number;
  /** 编辑这条消息 */
  update_id?: number;
  /** 不提醒对方 */
  silence?: boolean;
}

/** 发送文本，返回服务器上的消息 */
export async function sendText(client: ApiClient, params: SendTextParams) {
  const { data } = await requestParsed(client, 'dialog/msg/sendtext', msgSchema, {
    method: 'post',
    data: {
      dialog_id: params.dialog_id,
      text: params.text,
      text_type: params.md ? 'md' : undefined,
      reply_id: params.reply_id,
      update_id: params.update_id,
      silence: params.silence ? 'yes' : undefined,
    },
  });
  return data;
}

/** 语音：base64 是带音频类型的 data URL（服务端只收 mp3、wav、m4a），duration 毫秒（不少于 600） */
export type RecordParams = {
  dialog_id: number;
  base64: string;
  duration: number;
};

/** 发送语音，返回服务器上的消息 */
export async function sendRecord(client: ApiClient, params: RecordParams & { reply_id?: number }) {
  const { data } = await requestParsed(client, 'dialog/msg/sendrecord', msgSchema, { method: 'post', data: params });
  return data;
}

/** 录音转文字（不发出）；dialog_id 让服务端取最近的聊天作上下文 */
export async function convertRecord(client: ApiClient, params: RecordParams) {
  const { data } = await requestParsed(client, 'dialog/msg/convertrecord', z.string(), { method: 'post', data: params });
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

/**
 * 操作一条消息后的结果：add 是因此产生的系统提示（标注、置顶、待办，可能是一条或多条），
 * update 是这条消息变化的字段（id 加变化的字段）。两者服务端也会推送，响应先到就先用
 */
const msgResultSchema = z.looseObject({ add: z.unknown().optional(), update: z.record(z.string(), z.unknown()).nullish() });
export type MsgResult = z.output<typeof msgResultSchema>;

/** 置顶 / 取消置顶这条消息（会话里只有一条置顶）；update 是会话的 top_msg_id、top_userid */
export async function msgTop(client: ApiClient, msgId: number) {
  return requestParsed(client, 'dialog/msg/top', msgResultSchema, { data: { msg_id: msgId } });
}

/** 当前置顶的消息，没有为 null */
export async function msgTopInfo(client: ApiClient, dialogId: number) {
  const { data } = await requestParsed(client, 'dialog/msg/topinfo', msgSchema.nullable().catch(null), { data: { dialog_id: dialogId } });
  return data;
}

/** 标注 / 取消标注 */
export async function msgTag(client: ApiClient, msgId: number) {
  return requestParsed(client, 'dialog/msg/tag', msgResultSchema, { data: { msg_id: msgId } });
}

export interface MsgTodoParams {
  msg_id: number;
  /** all：会话全部成员；user：userids 指定的成员（空数组即取消所有人的待办） */
  type: 'all' | 'user';
  userids?: number[];
  /** 提醒时间（服务器时区 `YYYY-MM-DD HH:mm:ss`），null 为不提醒；省略则不动已有的提醒 */
  remind_at?: string | null;
}

/** 设待办 / 取消待办；add 可能有两条（取消一部分人、新增一部分人） */
export async function msgTodo(client: ApiClient, params: MsgTodoParams) {
  return requestParsed(client, 'dialog/msg/todo', msgResultSchema, {
    method: 'post',
    data: { ...params, remind_at: params.remind_at === null ? '' : params.remind_at },
  });
}

export const todoRowSchema = z.looseObject({ id: num, userid: num, done_at: str.nullish(), remind_at: str.nullish() });
export type TodoRow = z.output<typeof todoRowSchema>;

/** 这条消息的待办名单：每人一行，完成了有 done_at */
export async function msgTodoList(client: ApiClient, msgId: number) {
  const { data } = await requestParsed(client, 'dialog/msg/todolist', phpList(todoRowSchema), { data: { msg_id: msgId } });
  return data;
}

/** 设置或取消（remind_at 为空）某些成员的待办提醒 */
export async function msgTodoRemind(client: ApiClient, params: { msg_id: number; userids: number[]; remind_at: string }) {
  const { msg } = await client.request('dialog/msg/todoremind', { method: 'post', data: params });
  return msg;
}

export interface ForwardParams {
  msg_ids: number[];
  /** 合并成一条转发（最多 100 条）；否则逐条转发 */
  merge: boolean;
  dialogids: number[];
  userids: number[];
  /** 显示原发送人 */
  show_source: boolean;
  /** 附言，跟在转发的消息后面发 */
  leave_message: string;
}

/** 转发，返回在各个目标会话里产生的消息 */
export async function forward(client: ApiClient, params: ForwardParams) {
  const { msg_ids, merge, show_source, ...rest } = params;
  const ids = !merge && msg_ids.length === 1 ? { msg_id: msg_ids[0] } : { msg_ids };
  const { data, msg } = await requestParsed(client, merge ? 'dialog/msg/mergeforward' : 'dialog/msg/forward', z.looseObject({ msgs: phpList(msgSchema) }), {
    data: { ...ids, ...rest, show_source: show_source ? 1 : 0 },
  });
  return { msgs: data.msgs, msg };
}

/** 翻译文字或语音转写的内容；同一语言服务端有缓存，force 重新翻译 */
export async function msgTranslation(client: ApiClient, params: { msg_id: number; language: string; force?: boolean }) {
  const { data } = await requestParsed(client, 'dialog/msg/translation', z.looseObject({ msg_id: num, language: str, content: str }), {
    data: { ...params, force: params.force ? 1 : 0 },
  });
  return data;
}

/** 语音转文字，返回带转写内容（msg.text）的消息 */
export async function msgVoice2text(client: ApiClient, msgId: number) {
  const { data } = await requestParsed(client, 'dialog/msg/voice2text', msgSchema, { data: { msg_id: msgId } });
  return data;
}

/** 已读名单（只有发送人能看）：每个接收人一行，read_at 为空是未读 */
export async function msgReadList(client: ApiClient, msgId: number) {
  const { data } = await requestParsed(client, 'dialog/msg/readlist', phpList(z.looseObject({ userid: num, read_at: str.nullish() })), { data: { msg_id: msgId } });
  return data;
}

/** 会话成员（不含已停用的账号） */
export async function members(client: ApiClient, dialogId: number) {
  const { data } = await requestParsed(client, 'dialog/user', phpList(z.looseObject({ userid: num, bot: num.nullish() })), { data: { dialog_id: dialogId } });
  return data;
}

export const myTodoSchema = z.looseObject({ id: num, msg_id: num, dialog_id: num });
export type MyTodo = z.output<typeof myTodoSchema>;

/** 自己在这个会话里没完成的待办（最多 50 条，新的在前） */
export async function myTodos(client: ApiClient, dialogId: number) {
  const { data } = await requestParsed(client, 'dialog/todo', phpList(myTodoSchema), { data: { dialog_id: dialogId } });
  return data;
}

/** 完成自己的一条待办（id 是待办行的 id，不是消息 id） */
export async function msgDone(client: ApiClient, todoId: number) {
  return requestParsed(client, 'dialog/msg/done', msgResultSchema, { data: { id: todoId } });
}

const stickerSchema = z.looseObject({ list: z.array(z.looseObject({ name: z.string(), src: z.string() })) });

/** 搜索在线贴纸（服务端转查外部贴纸库） */
export async function stickerSearch(client: ApiClient, key: string) {
  const { data } = await requestParsed(client, 'dialog/sticker/search', stickerSchema, { data: { key } });
  return data.list;
}
