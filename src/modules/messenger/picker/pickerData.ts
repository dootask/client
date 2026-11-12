import { contactsApi, dialogApi, projectApi, usersApi } from '../../../sync/api';
import type { Dialog } from '../../../sync/api/dialog';
import type { UserBasic } from '../../../sync/api/users';
import type { StoredDialog } from '../../../sync/messenger';
import { api } from '../../session';

/**
 * 选会话（转发）的数据（同旧版 App 的 pickerApi、网页 sharedWebViewUserPicker）：
 * 最近会话取自会话缓存，部门、项目、成员、搜索向服务端取
 */

/** 列表里的一个人：sub 为部门（没有时为职位或邮箱），az 为拼音首字母 */
export interface PickUser {
  userid: number;
  nickname: string;
  userimg: string;
  bot: boolean;
  sub: string;
  az: string;
}

/** 群（最近会话里的，或按名字向服务端搜到的）：match 为搜索用的名字和拼音（小写） */
export interface PickGroup {
  dialogId: number;
  name: string;
  avatar: string;
  groupType: string;
  people: number;
  match: string;
}

export type Picked = PickUser | PickGroup;

export interface PickDepartment {
  id: number;
  name: string;
  level: number;
  /** 含下级部门的人数 */
  count: number;
  /** 含下级部门的 id */
  ids: number[];
}

export interface PickProject {
  id: number;
  name: string;
  userids: number[];
}

export interface PickSources {
  /** 全部在职成员数（不含机器人，同成员列表口径） */
  total: number;
  departments: PickDepartment[];
  projects: PickProject[];
}

export interface MemberPage {
  list: PickUser[];
  page: number;
  last: number;
  total: number;
}

/** 搜索最多返回的人数（同旧前端） */
const SEARCH_TAKE = 50;

export function isGroup(item: Picked): item is PickGroup {
  return 'dialogId' in item;
}

/** 选中项的标识（同转发目标）："u:用户id" / "d:会话id" */
export function pickKey(item: Picked): string {
  return isGroup(item) ? `d:${item.dialogId}` : `u:${item.userid}`;
}

export function pickName(item: Picked): string {
  return isGroup(item) ? item.name : item.nickname;
}

function pickGroup(d: Pick<Dialog, 'id' | 'name' | 'avatar' | 'group_type' | 'people' | 'pinyin'>): PickGroup {
  const name = d.name ?? '';
  return { dialogId: d.id, name, avatar: d.avatar ?? '', groupType: d.group_type || 'default', people: d.people ?? 0, match: `${name} ${d.pinyin ?? ''}`.toLowerCase() };
}

function pickUser(user: UserBasic): PickUser {
  const departments = (user.department_info ?? []).map((dept) => dept.name).join(' · ');
  return {
    userid: user.userid,
    nickname: user.nickname,
    userimg: user.userimg ?? '',
    bot: !!user.bot,
    sub: departments || user.profession || user.email || '',
    az: user.az ?? '',
  };
}

/** 最近会话：单聊（有对方）和群，按置顶、待办、最近消息排序（同旧前端） */
export function recentsOf(dialogs: Record<number, StoredDialog>): Picked[] {
  return Object.values(dialogs)
    .filter((d) => d.name !== undefined && d.dialog_delete !== 1 && (d.type !== 'user' || !!d.dialog_user))
    .sort((a, b) => {
      if (a.top_at || b.top_at) return (b.top_at ?? '').localeCompare(a.top_at ?? '');
      if ((a.todo_num ?? 0) > 0 || (b.todo_num ?? 0) > 0) return (b.todo_num ?? 0) - (a.todo_num ?? 0);
      return (b.last_at ?? '').localeCompare(a.last_at ?? '');
    })
    .map((d): Picked => {
      if (d.type !== 'user') return pickGroup(d);
      return { userid: d.dialog_user!.userid, nickname: d.name ?? '', userimg: d.userimg ?? '', bot: !!d.bot, sub: d.email ?? '', az: '' };
    });
}

async function teamProjects(): Promise<PickProject[]> {
  const list: PickProject[] = [];
  for (let page = 1; ; page++) {
    const data = await projectApi.teamProjects(api, page);
    list.push(...data.data.map(({ id, name, userid_list }) => ({ id, name: name ?? '', userids: userid_list ?? [] })));
    if (data.current_page >= data.last_page) return list;
  }
}

/**
 * 部门和项目：部门是深度优先的扁平列表（ids、count 含下级），有没分部门的人时最后加「默认部门」（id 0）；
 * 项目是我参与的团队项目
 */
export async function loadSources(noDepartment: string): Promise<PickSources> {
  const [data, projects] = await Promise.all([contactsApi.departments(api), teamProjects()]);
  const list = data.departments;
  const departments = list.map((dept, index): PickDepartment => {
    const level = dept.level ?? 0;
    const ids = [dept.id];
    for (let i = index + 1; i < list.length && (list[i]!.level ?? 0) > level; i++) ids.push(list[i]!.id);
    return { id: dept.id, name: dept.name ?? '', level, count: dept.total_count ?? 0, ids };
  });
  const rest = data.no_department_count ?? 0;
  if (rest > 0) departments.push({ id: 0, name: noDepartment, level: 0, count: rest, ids: [0] });
  return { total: data.total ?? 0, departments, projects };
}

/** 成员一页（按拼音排序，不含机器人）：departments 为部门 id（含下级），project_id 为项目，都不给是全部成员 */
export async function loadMembers(params: { departments?: readonly number[]; project_id?: number; page: number }): Promise<MemberPage> {
  const data = await usersApi.memberPage(api, params);
  return { list: data.data.map(pickUser), page: data.current_page, last: data.last_page, total: data.total };
}

/** 按名字、邮箱、拼音、职位搜成员（含机器人） */
export async function searchUsers(word: string): Promise<PickUser[]> {
  const list = await usersApi.search(api, word, { bots: true, take: SEARCH_TAKE, withDepartment: true });
  return list.map(pickUser);
}

/**
 * 按名字向服务端搜我所在的群（最多 20 个）：本地只缓存了最近的会话，很久没消息的群要靠这个找到（旧版只搜本地，搜不到）
 */
export async function searchGroups(word: string): Promise<PickGroup[]> {
  const list = await dialogApi.search(api, word, { dialogOnly: true });
  return list.flatMap((d) => (d.type !== 'user' && typeof d.id === 'number' ? [pickGroup({ ...d, id: d.id })] : []));
}
