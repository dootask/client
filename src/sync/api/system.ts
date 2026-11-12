import { z } from 'zod';

import type { ApiClient } from './client';
import { requestParsed } from './schema';

/** system/setting（type=get）面向所有用户的系统设置；只校验前端依赖的字段，其余原样保留 */
export const systemSettingSchema = z.looseObject({
  reg: z.string(),
  login_code: z.string(),
  password_policy: z.string(),
  e2e_message: z.string(),
  anon_message: z.string(),
  system_alias: z.string(),
  login_logo: z.string(),
  server_timezone: z.string(),
  server_version: z.string(),
});
export type SystemSetting = z.output<typeof systemSettingSchema>;

export async function systemSetting(client: ApiClient) {
  const { data } = await requestParsed(client, 'system/setting', systemSettingSchema, { checkAuth: false });
  return data;
}

export const serverVersionSchema = z.looseObject({
  version: z.string(),
  device_count: z.number(),
  /** 未配置发布信息时服务端返回空数组 */
  publish: z.union([z.looseObject({}), z.array(z.unknown())]),
});
export type ServerVersion = z.output<typeof serverVersionSchema>;

/** 服务端版本号；请求头带 version 时服务端才会包成 {ret, data} 结构，client 总会带上 */
export async function serverVersion(client: ApiClient) {
  const { data } = await requestParsed(client, 'system/version', serverVersionSchema, { checkAuth: false });
  return data;
}

/** 比较 a.b.c 版本号：a < b 返回负数，相等返回 0 */
export function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * 上传图片（base64，带 data:image/... 前缀），返回地址。
 * fit 为 cover 时裁成 width×height（头像），percentage 时按比例缩到不超过（举报截图）
 */
export async function imageUpload(client: ApiClient, image64: string, { width, height, fit }: { width: number; height: number; fit: 'cover' | 'percentage' }) {
  const { data } = await requestParsed(client, 'system/imgupload', z.looseObject({ url: z.string() }), {
    method: 'post',
    data: { image64, width, height, whcut: fit },
  });
  return data.url;
}
