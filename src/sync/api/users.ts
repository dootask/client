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
});
export type UserBasic = z.output<typeof userBasicSchema>;

/** 一次最多取的人数（服务端限制） */
export const BASIC_BATCH = 50;

export async function basic(client: ApiClient, userids: readonly number[]) {
  const { data } = await requestParsed(client, 'users/basic', phpList(userBasicSchema), { data: { userid: JSON.stringify(userids) } });
  return data;
}
