import { z } from 'zod';

import type { ApiClient } from './client';
import { phpList, requestParsed } from './schema';

/**
 * 项目、任务接口（主仓库 ProjectController）：输入栏 # 候选的任务列表、选人时的项目成员
 */

const num = z.number();
const str = z.string();

export const taskBriefSchema = z.looseObject({
  id: num,
  name: str,
  project_id: num,
  parent_id: num,
  end_at: str.nullish(),
  complete_at: str.nullish(),
});
export type TaskBrief = z.output<typeof taskBriefSchema>;

export interface TaskListParams {
  /** 只查这个项目 */
  project_id?: number;
  /** -1 只要主任务 */
  parent_id?: number;
  /** 按 ID、名称、描述搜索 */
  name?: string;
  /** completed / uncompleted */
  status?: 'completed' | 'uncompleted';
  /** 不传 project_id 时查我参与的所有项目 */
  scope?: 'all_project';
  /** 1 我负责的，0 我协助的 */
  owner?: 0 | 1;
  sorts?: { end_at?: 'asc' | 'desc'; complete_at?: 'asc' | 'desc' };
  pagesize?: number;
}

/** 任务列表（未归档、未删除），只取第一页 */
export async function taskList(client: ApiClient, { name, status, ...params }: TaskListParams) {
  const { data } = await requestParsed(client, 'project/task/lists', z.looseObject({ data: phpList(taskBriefSchema) }), {
    data: { ...params, keys: { name, status } },
  });
  return data.data;
}

/** 我参与的团队项目和成员 id（选人时按项目列成员），一页 100 个 */
export async function teamProjects(client: ApiClient, page: number) {
  const { data } = await requestParsed(
    client,
    'project/lists',
    z.looseObject({ data: phpList(z.looseObject({ id: num, name: str.nullish(), userid_list: z.array(num).nullish() })), current_page: num, last_page: num }),
    { data: { type: 'team', getuserid: 'yes', getstatistics: 'no', page, pagesize: 100 } },
  );
  return data;
}
