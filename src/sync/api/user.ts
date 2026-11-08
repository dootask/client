import { z } from 'zod';

import type { ApiClient } from './client';
import { ApiError } from './errors';
import { phpList, requestParsed } from './schema';

/** 登录、注册、获取我的信息共用的用户对象；只校验前端依赖的字段，其余原样保留 */
export const userInfoSchema = z.looseObject({
  userid: z.number(),
  email: z.string(),
  nickname: z.string(),
  userimg: z.string(),
  identity: phpList(z.string()),
  department: phpList(z.number()),
  token: z.string(),
  tel: z.string().nullish(),
  profession: z.string().nullish(),
  lang: z.string().nullish(),
  bot: z.number().nullish(),
  changepass: z.number().nullish(),
});
export type UserInfo = z.output<typeof userInfoSchema>;

/** users/info 在用户对象之外额外返回的字段 */
export const myInfoSchema = userInfoSchema.extend({
  nickname_original: z.string().nullish(),
  department_name: z.string().nullish(),
  department_owner: z.boolean().optional(),
  managed_departments: z.array(z.looseObject({ id: z.number(), name: z.string() })).optional(),
});
export type MyInfo = z.output<typeof myInfoSchema>;

export interface LoginParams {
  type?: 'login' | 'reg';
  email: string;
  password: string;
  /** 验证码；配合 codeKey 走 codejson 校验 */
  code?: string;
  codeKey?: string;
  /** 注册邀请码 */
  invite?: string;
}

/**
 * 登录失败时 ApiError.data.code：
 * - need：需要（或重新输入）验证码
 * - email：需要先验证邮箱
 * - no：密码错误等，且当前不需要验证码
 */
export type LoginErrorCode = 'need' | 'email' | 'no';

export function loginErrorCode(err: unknown): LoginErrorCode | undefined {
  if (!(err instanceof ApiError) || err.kind !== 'server') return undefined;
  const code = (err.data as { code?: unknown } | null)?.code;
  return code === 'need' || code === 'email' || code === 'no' ? code : undefined;
}

export async function login(client: ApiClient, params: LoginParams) {
  const { data } = await requestParsed(client, 'users/login', userInfoSchema, {
    method: 'post',
    data: {
      type: params.type ?? 'login',
      email: params.email,
      password: params.password,
      code: params.code,
      code_key: params.codeKey,
      invite: params.invite,
    },
    checkAuth: false,
  });
  return data;
}

/** 该账号登录是否需要验证码（服务端用 ret=1 表示需要、ret=0 表示不需要） */
export async function needCode(client: ApiClient, email: string): Promise<boolean> {
  try {
    await client.request('users/login/needcode', { data: { email }, checkAuth: false });
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.kind === 'server' && err.ret === 0) return false;
    throw err;
  }
}

export const captchaSchema = z.looseObject({
  key: z.string(),
  /** data URI，可直接作为图片地址 */
  img: z.string(),
});

/** 获取验证码图片（JSON 形式），登录时把 key 作为 codeKey 回传 */
export async function captcha(client: ApiClient) {
  const { data } = await requestParsed(client, 'users/login/codejson', captchaSchema, { checkAuth: false });
  return data;
}

export const regStatusSchema = z.object({ enabled: z.boolean(), need: z.boolean() });

/** 注册是否开放、是否需要邀请码 */
export async function regStatus(client: ApiClient) {
  const { data } = await requestParsed(client, 'users/reg/needinvite', regStatusSchema, { checkAuth: false });
  return data;
}

/** 获取我的信息；移动端 token 临近过期时服务端会在 token 字段返回新值 */
export async function myInfo(client: ApiClient) {
  const { data } = await requestParsed(client, 'users/info', myInfoSchema);
  return data;
}

/** 修改我的资料（只列出用到的字段）；返回修改后的用户对象 */
export async function editData(client: ApiClient, data: { nickname?: string; tel?: string }) {
  const { data: user } = await requestParsed(client, 'users/editdata', userInfoSchema, { method: 'post', data });
  return user;
}

export async function logout(client: ApiClient) {
  await client.request('users/logout', { checkAuth: false });
}
