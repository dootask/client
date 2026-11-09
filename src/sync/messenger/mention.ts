import type { UserBasic } from '../api/users';
import type { TaskBrief, TaskListParams } from '../api/project';
import type { FileBrief } from '../api/file';
import type { MentionChar } from './compose';
import type { MessengerState } from './store';

/**
 * 输入栏候选的数据：@ 群内成员（界面按用户目录本地过滤）、@ 群外成员，# 任务、~ 文件、% 报告。
 * 来源和分组与旧前端输入框一致（ChatInput getMentionSource）
 */

export interface MentionApi {
  members: (dialogId: number) => Promise<{ userid: number; bot?: number | null }[]>;
  searchUsers: (key: string, opts: { bots: boolean }) => Promise<UserBasic[]>;
  taskList: (params: TaskListParams) => Promise<TaskBrief[]>;
  fileSearch: (key: string) => Promise<FileBrief[]>;
  reportList: (box: 'mine' | 'received', key: string) => Promise<{ id: number; title: string }[]>;
}

/** 分组：界面按它显示分组标题 */
export type MentionGroupKind =
  | 'outsiders'
  | 'projectTasks'
  | 'myTasks'
  | 'assistTasks'
  | 'otherTasks'
  | 'files'
  | 'myReports'
  | 'receivedReports';

export interface MentionCandidate {
  id: number;
  name: string;
  /** 已完成的任务 */
  done?: boolean;
  /** @ 群外成员的资料 */
  user?: UserBasic;
}

export interface MentionGroup {
  kind: MentionGroupKind;
  items: MentionCandidate[];
}

/** 一组任务最多显示多少条 */
const TASK_LIMIT = 100;
/** 群外成员里按最近联系排在前面的人数 */
const RECENT_CONTACTS = 5;
/** 没有截止时间的任务排在最后 */
const NO_END = '2099-12-31 23:59:59';

function matches(item: MentionCandidate, query: string) {
  if (!query) return true;
  if (/^\d+$/.test(query) && item.id === Number(query)) return true;
  return item.name.toLowerCase().includes(query.toLowerCase());
}

/** 去掉前面分组已有的、不匹配的条目和空分组 */
function finish(groups: MentionGroup[], query: string): MentionGroup[] {
  const seen = new Set<number>();
  return groups
    .map(({ kind, items }) => ({
      kind,
      items: items.filter((item) => {
        if (seen.has(item.id) || !matches(item, query)) return false;
        seen.add(item.id);
        return true;
      }),
    }))
    .filter(({ items }) => items.length > 0);
}

const taskItems = (tasks: TaskBrief[]): MentionCandidate[] => tasks.slice(0, TASK_LIMIT).map((task) => ({ id: task.id, name: task.name, done: !!task.complete_at }));
const byEndTime = (a: TaskBrief, b: TaskBrief) => (a.end_at || NO_END).localeCompare(b.end_at || NO_END);

/**
 * 一个会话页的候选来源：打开期间任务的基础分组（项目任务、我的待完成、我协助的）只取一次，
 * 输入关键词后再按关键词搜其他任务；文件、报告、群外成员每次按关键词取
 */
export function createMentionSession(api: MentionApi, getState: () => MessengerState, dialogId: number, userId: number) {
  let baseTasks: Promise<MentionGroup[]> | null = null;

  async function loadBaseTasks(): Promise<MentionGroup[]> {
    const dialog = getState().dialogs[dialogId];
    const projectId = dialog?.group_type === 'project' ? (dialog.group_info?.id ?? 0) : 0;
    const uncompleted = { scope: 'all_project', status: 'uncompleted', sorts: { end_at: 'asc' }, pagesize: TASK_LIMIT } as const;
    const [project, mine, assist] = await Promise.all([
      projectId > 0 ? api.taskList({ project_id: projectId, parent_id: -1, pagesize: TASK_LIMIT }) : null,
      api.taskList({ ...uncompleted, owner: 1 }),
      api.taskList({ ...uncompleted, owner: 0 }),
    ]);
    const groups: MentionGroup[] = [];
    // 项目任务：未完成的在前，已完成的按完成时间新的在前
    if (project) groups.push({ kind: 'projectTasks', items: taskItems([...project].sort((a, b) => (b.complete_at || NO_END).localeCompare(a.complete_at || NO_END))) });
    groups.push({ kind: 'myTasks', items: taskItems([...mine].sort(byEndTime)) });
    groups.push({ kind: 'assistTasks', items: taskItems([...assist].sort(byEndTime)) });
    return groups;
  }

  async function tasks(query: string): Promise<MentionGroup[]> {
    baseTasks ??= loadBaseTasks().catch((err: unknown) => {
      baseTasks = null;
      throw err;
    });
    const groups = [...(await baseTasks)];
    if (query) groups.push({ kind: 'otherTasks', items: taskItems(await api.taskList({ name: query, parent_id: -1, scope: 'all_project', pagesize: 50 })) });
    return groups;
  }

  async function files(query: string): Promise<MentionGroup[]> {
    const list = await api.fileSearch(query);
    return [{ kind: 'files', items: list.filter((f) => f.type !== 'folder').map((f) => ({ id: f.id, name: f.ext ? `${f.name}.${f.ext}` : f.name })) }];
  }

  async function reports(query: string): Promise<MentionGroup[]> {
    const [mine, received] = await Promise.all([api.reportList('mine', query), api.reportList('received', query)]);
    const items = (list: { id: number; title: string }[]) => list.map((r) => ({ id: r.id, name: r.title }));
    return [
      { kind: 'myReports', items: items(mine) },
      { kind: 'receivedReports', items: items(received) },
    ];
  }

  /** 群外成员：只有群主和无主的群能 @ 到群外的人，最近联系的几个人在前 */
  async function outsiders(query: string, exclude: readonly number[]): Promise<MentionGroup[]> {
    const { dialogs } = getState();
    const dialog = dialogs[dialogId];
    if (dialog?.type !== 'group' || ![0, userId].includes(dialog.owner_id ?? -1)) return [];
    const users = await api.searchUsers(query, { bots: true });
    const recent = new Map(
      Object.values(dialogs)
        .filter((d) => d.type === 'user' && !d.bot && d.last_at && d.dialog_user)
        .sort((a, b) => b.last_at!.localeCompare(a.last_at!))
        .slice(0, RECENT_CONTACTS)
        .map((d) => [d.dialog_user!.userid, d.last_at!]),
    );
    const rank = (user: UserBasic) => recent.get(user.userid) ?? '';
    const items = users
      .filter((user) => !exclude.includes(user.userid))
      .sort((a, b) => rank(b).localeCompare(rank(a)))
      .map((user) => ({ id: user.userid, name: user.nickname, user }));
    return [{ kind: 'outsiders', items }];
  }

  return {
    /** 会话成员（含机器人） */
    members: () => api.members(dialogId),

    /** 按符号和关键词取候选；@ 只取群外成员（exclude 为群内成员），服务端已按昵称、邮箱、拼音搜过，不再按名称过滤 */
    async search(char: MentionChar, query: string, exclude: readonly number[]): Promise<MentionGroup[]> {
      switch (char) {
        case '@':
          return finish(await outsiders(query, exclude), '');
        case '#':
          return finish(await tasks(query), query);
        case '~':
          return finish(await files(query), query);
        case '%':
          return finish(await reports(query), query);
      }
    },
  };
}

export type MentionSession = ReturnType<typeof createMentionSession>;
