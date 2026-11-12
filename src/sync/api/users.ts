import { z } from 'zod';

import type { ApiClient } from './client';
import { phpList, requestParsed } from './schema';

/**
 * 其他用户的接口（主仓库 UsersController）。自己的登录、资料在 user.ts
 */

const num = z.number();
const str = z.string();

/** users/basic 返回的基础信息（User::$basicField，已删除的账号来自 UserDelete） */
export const userBasicSchema = z.looseObject({
  userid: num,
  email: str.nullish(),
  nickname: str,
  profession: str.nullish(),
  userimg: str.nullish(),
  bot: num.nullish(),
  pinyin: str.nullish(),
  line_at: str.nullish(),
  /** 取资料那一刻是否在线；之后靠 line 推送更新 */
  online: z.boolean().nullish(),
  disable_at: str.nullish(),
  delete_at: str.nullish(),
  /** 拼音首字母（大写），成员列表分组用 */
  az: str.nullish(),
  /** 所在部门：搜索、成员列表带 with_department 时才有 */
  department_info: z.array(z.looseObject({ name: str })).nullish(),
  /** 部门名（逗号分隔）：users/basic 带 */
  department_name: str.nullish(),
});
export type UserBasic = z.output<typeof userBasicSchema>;

/** 一次最多取的人数（服务端限制） */
export const BASIC_BATCH = 50;

export async function basic(client: ApiClient, userids: readonly number[]) {
  const { data } = await requestParsed(client, 'users/basic', phpList(userBasicSchema), { data: { userid: JSON.stringify(userids) } });
  return data;
}

/** 消息是否已收藏 */
export async function favoriteCheck(client: ApiClient, msgId: number) {
  const { data } = await requestParsed(client, 'users/favorite/check', z.looseObject({ favorited: z.boolean() }), { data: { type: 'message', id: msgId } });
  return data.favorited;
}

/** 收藏 / 取消收藏消息；msg 是服务端的提示语 */
export async function favoriteToggle(client: ApiClient, msgId: number) {
  const { data, msg } = await requestParsed(client, 'users/favorite/toggle', z.looseObject({ favorited: z.boolean() }), { method: 'post', data: { type: 'message', id: msgId } });
  return { favorited: data.favorited, msg };
}

/** 修改收藏备注（1–255 字） */
export async function favoriteRemark(client: ApiClient, msgId: number, remark: string) {
  const { msg } = await client.request('users/favorite/remark', { method: 'post', data: { type: 'message', id: msgId, remark } });
  return msg;
}

/** 按昵称、拼音、职位、邮箱搜索在职的成员（默认不含机器人），带在线状态；withDepartment 时带所在部门 */
export async function search(client: ApiClient, key: string, { bots = false, take = 30, withDepartment = false }: { bots?: boolean; take?: number; withDepartment?: boolean } = {}) {
  const { data } = await requestParsed(client, 'users/search', phpList(userBasicSchema), {
    data: { keys: { key, bot: bots ? 2 : 0 }, state: 1, take, ...(withDepartment ? { with_department: 1 } : {}) },
  });
  return data;
}

/** 成员列表每页人数（同旧前端） */
export const MEMBER_PAGE = 100;

/** 成员列表的一页：按拼音排序，不含机器人，带所在部门。departments 为部门 id（含下级），project_id 为项目，都不给是全部成员 */
export async function memberPage(client: ApiClient, { departments, project_id, page }: { departments?: readonly number[]; project_id?: number; page: number }) {
  const keys = departments ? { departments: departments.join(',') } : project_id ? { project_id } : {};
  const { data } = await requestParsed(client, 'users/search', z.looseObject({ data: phpList(userBasicSchema), current_page: num, last_page: num, total: num }), {
    data: { keys, sorts: { az: 'asc' }, page, pagesize: MEMBER_PAGE, with_department: 1 },
  });
  return data;
}

/** 个性标签（users/tags/*），按认可数排序；can_edit、can_delete 由服务端按查看者算 */
export const userTagSchema = z.looseObject({
  id: num,
  name: str,
  created_by: num,
  created_by_name: str.nullish(),
  recognition_total: num,
  recognized: z.boolean(),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});
export type UserTag = z.output<typeof userTagSchema>;

const tagsSchema = z.looseObject({ list: phpList(userTagSchema), top: phpList(userTagSchema), total: num });
export type UserTags = z.output<typeof tagsSchema>;

/** 资料页的扩展信息：生日、简介、前 10 个标签，works_visible 为能否看对方的工作 */
export async function extra(client: ApiClient, userid: number) {
  const schema = z.looseObject({
    birthday: str.nullish(),
    introduction: str.nullish(),
    personal_tags: phpList(userTagSchema),
    personal_tags_total: num,
    works_visible: z.boolean().nullish(),
  });
  const { data } = await requestParsed(client, 'users/extra', schema, { data: { userid } });
  return data;
}

export async function tags(client: ApiClient, userid: number) {
  const { data } = await requestParsed(client, 'users/tags/lists', tagsSchema, { data: { userid } });
  return data;
}

/** 增、改、删、认可（再点取消）标签，都返回最新的整份标签 */
export type TagAction = { type: 'add'; userid: number; name: string } | { type: 'update'; tag_id: number; name: string } | { type: 'delete' | 'recognize'; tag_id: number };

export async function tagAction(client: ApiClient, { type, ...params }: TagAction) {
  const { data, msg } = await requestParsed(client, `users/tags/${type}`, tagsSchema, { method: 'post', data: params });
  return { tags: data, msg };
}

/** 机器人资料（只有主人和改系统机器人的管理员能取） */
export const botSchema = z.looseObject({
  id: num,
  name: str,
  avatar: str.nullish(),
  system_name: str.nullish(),
  clear_day: num,
  webhook_url: str.nullish(),
  webhook_events: phpList(str).nullish(),
});
export type Bot = z.output<typeof botSchema>;

export async function botInfo(client: ApiClient, botId: number) {
  const { data } = await requestParsed(client, 'users/bot/info', botSchema, { data: { id: botId } });
  return data;
}

/** 改机器人：只传要改的字段；clear_day、webhook_* 只有主人能改 */
export async function botEdit(
  client: ApiClient,
  params: { id: number; dialog_id: number; name?: string; avatar?: string; clear_day?: number; webhook_url?: string; webhook_events?: string[] },
) {
  const { data, msg } = await requestParsed(client, 'users/bot/edit', botSchema, { method: 'post', data: params });
  return { bot: data, msg };
}
