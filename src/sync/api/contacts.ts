import { z } from 'zod';

import type { ApiClient } from './client';
import { phpList, requestParsed } from './schema';

/**
 * 通讯录接口（主仓库 ContactsController）
 */

const num = z.number();

/**
 * 部门树：深度优先排好的扁平列表（level 为层级，total_count 含下级部门人数）；
 * no_department_count 为没分部门的人数，total 为全部在职成员数（不含机器人）
 */
export async function departments(client: ApiClient) {
  const { data } = await requestParsed(
    client,
    'contacts/departments',
    z.looseObject({
      departments: phpList(z.looseObject({ id: num, name: z.string().nullish(), level: num.nullish(), total_count: num.nullish() })),
      no_department_count: num.nullish(),
      total: num.nullish(),
    }),
  );
  return data;
}
