import { z } from 'zod';

import type { ApiClient } from './client';
import { dialogSchema } from './dialog';
import { phpList, requestParsed } from './schema';

/**
 * 群和会话设置的接口（主仓库 DialogController 的 group/*、config，ComplaintController）。
 * 建群返回新会话，改群资料只回改了的字段，调用方合进会话缓存
 */

const num = z.number();
const str = z.string();

/** 群成员（dialog/user 带 getuser），群主、群管理员身份看会话的 owner_id、deputy_ids */
export const memberSchema = z.looseObject({
  userid: num,
  nickname: str.nullish(),
  userimg: str.nullish(),
  email: str.nullish(),
  pinyin: str.nullish(),
  bot: num.nullish(),
  online: z.boolean().nullish(),
  /** 入群时间，非管理员按它排 */
  created_at: str.nullish(),
});
export type Member = z.output<typeof memberSchema>;

export async function members(client: ApiClient, dialogId: number) {
  const { data } = await requestParsed(client, 'dialog/user', phpList(memberSchema), { data: { dialog_id: dialogId, getuser: 1 } });
  return data;
}

/** 新建群，userids 要含自己，返回新会话 */
export async function create(client: ApiClient, params: { userids: number[]; chat_name: string; avatar?: string }) {
  const { data, msg } = await requestParsed(client, 'dialog/group/add', dialogSchema, { data: params });
  return { dialog: data, msg };
}

/** 改群资料只回改了的字段 */
const editedSchema = z.looseObject({ id: num, name: str.optional(), avatar: str.optional() });

/**
 * 改群名称或头像，返回改了的字段。全员群由系统管理员修改时 admin 为真（服务端按管理员身份校验）
 */
export async function edit(client: ApiClient, dialogId: number, patch: { name?: string; avatar?: string }, admin = false) {
  const { data, msg } = await requestParsed(client, 'dialog/group/edit', editedSchema, {
    data: { dialog_id: dialogId, ...patch, ...(admin ? { admin: 1 } : {}) },
  });
  return { dialog: data, msg };
}

export async function addMembers(client: ApiClient, dialogId: number, userids: number[]) {
  const { msg } = await client.request('dialog/group/adduser', { data: { dialog_id: dialogId, userids } });
  return msg;
}

export async function removeMember(client: ApiClient, dialogId: number, userid: number) {
  const { msg } = await client.request('dialog/group/deluser', { data: { dialog_id: dialogId, userids: [userid] } });
  return msg;
}

/** 退出群（不带 userids 的 deluser） */
export async function exit(client: ApiClient, dialogId: number) {
  const { msg } = await client.request('dialog/group/deluser', { data: { dialog_id: dialogId } });
  return msg;
}

/** 任命 / 罢免群管理员；名单在会话数据里，之后要重新取会话 */
export async function setDeputy(client: ApiClient, dialogId: number, userid: number, deputy: boolean) {
  const { msg } = await client.request(deputy ? 'dialog/group/adddeputy' : 'dialog/group/deldeputy', { method: 'post', data: { dialog_id: dialogId, userid } });
  return msg;
}

/** 转让群主；之后要重新取会话 */
export async function transfer(client: ApiClient, dialogId: number, userid: number) {
  const { msg } = await client.request('dialog/group/transfer', { data: { dialog_id: dialogId, userid } });
  return msg;
}

export async function disband(client: ApiClient, dialogId: number) {
  const { msg } = await client.request('dialog/group/disband', { data: { dialog_id: dialogId } });
  return msg;
}

/** 共同群聊数（对方资料页显示） */
export async function commonCount(client: ApiClient, userid: number) {
  const { data } = await requestParsed(client, 'dialog/common/list', z.looseObject({ total: num }), { data: { target_userid: userid, only_count: 'yes' } });
  return data.total;
}

const commonPageSchema = z.looseObject({
  data: phpList(z.looseObject({ id: num, name: str.nullish(), avatar: str.nullish(), group_type: str.nullish(), people: num.nullish() })),
  next_page_url: str.nullish(),
});

/** 共同群聊的一页（每页 20） */
export async function commonPage(client: ApiClient, userid: number, page: number) {
  const { data } = await requestParsed(client, 'dialog/common/list', commonPageSchema, { data: { target_userid: userid, page } });
  return { list: data.data, more: !!data.next_page_url };
}

/** AI 机器人单聊的提示词 */
export async function prompt(client: ApiClient, dialogId: number) {
  const { data } = await requestParsed(client, 'dialog/config', z.looseObject({ value: str.nullish() }), { data: { dialog_id: dialogId, type: 'ai_prompt' } });
  return data.value ?? '';
}

export async function savePrompt(client: ApiClient, dialogId: number, value: string) {
  const { msg } = await client.request('dialog/config/save', { method: 'post', data: { dialog_id: dialogId, type: 'ai_prompt', value } });
  return msg;
}

/** 举报会话；imgs 是 system/imgupload 返回的地址 */
export async function report(client: ApiClient, params: { dialog_id: number; type: number; reason: string; imgs: string[] }) {
  const { imgs, ...rest } = params;
  const { msg } = await client.request('complaint/submit', { method: 'post', data: { ...rest, imgs: imgs.map((path) => ({ path })) } });
  return msg;
}
