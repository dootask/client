import { z } from 'zod';

import type { ApiClient } from './client';
import { phpList, requestParsed } from './schema';

/**
 * 工作汇报接口（主仓库 ReportController）。目前只有输入栏 % 候选用到列表
 */

const reportPageSchema = z.looseObject({ data: phpList(z.looseObject({ id: z.number(), title: z.string() })) });

/** 我发出的（mine）或收到的（received）汇报，按标题搜索，只取第一页 */
export async function list(client: ApiClient, box: 'mine' | 'received', key: string) {
  const { data } = await requestParsed(client, box === 'mine' ? 'report/my' : 'report/receive', reportPageSchema, { data: { keys: { key } } });
  return data.data;
}
