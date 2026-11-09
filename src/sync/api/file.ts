import { z } from 'zod';

import type { ApiClient } from './client';
import { phpList, requestParsed } from './schema';

/**
 * 文件接口（主仓库 FileController）。目前只有输入栏 ~ 候选用到搜索
 */

export const fileBriefSchema = z.looseObject({ id: z.number(), name: z.string(), type: z.string(), ext: z.string().nullish() });
export type FileBrief = z.output<typeof fileBriefSchema>;

/** 按文件名搜索自己能看到的文件（含文件夹），最多 50 个 */
export async function search(client: ApiClient, key: string) {
  const { data } = await requestParsed(client, 'file/search', phpList(fileBriefSchema), { data: { key } });
  return data;
}
