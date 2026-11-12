import { z } from 'zod';

import type { ApiClient } from './client';
import { phpList, requestParsed } from './schema';

/**
 * 文件接口（主仓库 FileController）：输入栏 ~ 候选的搜索、消息里文件分享码的打开
 */

export const fileBriefSchema = z.looseObject({ id: z.number(), name: z.string(), type: z.string(), ext: z.string().nullish() });
export type FileBrief = z.output<typeof fileBriefSchema>;

/** 按文件名搜索自己能看到的文件（含文件夹），最多 50 个 */
export async function search(client: ApiClient, key: string) {
  const { data } = await requestParsed(client, 'file/search', phpList(fileBriefSchema), { data: { key } });
  return data;
}

export const sharedFileSchema = z.looseObject({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  ext: z.string().nullish(),
  size: z.number().nullish(),
  content_url: z.string().nullish(),
});
export type SharedFile = z.output<typeof sharedFileSchema>;

/** 文件分享码（消息里的 dootask://file/<分享码>）指向的文件，带下载地址 */
export async function byCode(client: ApiClient, code: string) {
  const { data } = await requestParsed(client, 'file/one', sharedFileSchema, { data: { id: code, with_url: 'yes' } });
  return data;
}
