import type { Departments } from '../api/contacts';
import type { UserBasic } from '../api/users';
import { letterGroups, matchesUser } from '../users/list';

export interface ContactDepartment {
  id: number;
  name: string;
  level: number;
  count: number;
  owner: number;
  ids: number[];
}

export function departmentGroups(data: Departments): ContactDepartment[] {
  const list = data.departments;
  const groups = list.map((dept, index) => {
    const level = dept.level ?? 0;
    const ids = [dept.id];
    for (let i = index + 1; i < list.length && (list[i]!.level ?? 0) > level; i++) ids.push(list[i]!.id);
    return { id: dept.id, name: dept.name ?? '', level, count: dept.total_count ?? 0, owner: dept.owner_userid ?? 0, ids };
  });
  if ((data.no_department_count ?? 0) > 0) groups.push({ id: 0, name: '', level: 0, count: data.no_department_count!, owner: 0, ids: [0] });
  return groups;
}

export function initialExpanded(departments: readonly ContactDepartment[]): Set<number> {
  return new Set(departments.filter((dept) => dept.level === 0 && (dept.id !== 0 || departments.length === 1)).map((dept) => dept.id));
}

export type ContactRow =
  | { kind: 'label'; key: string; title: string; level: number; department?: number; count?: number; expanded?: boolean }
  | { kind: 'user'; key: string; userid: number; nickname: string; uri: string; online: boolean; tags: string; level: number };

function userRow(user: UserBasic, prefix: string, level: number, keyword: string): ContactRow {
  const tags = [...(user.tags ?? [])];
  const profession = user.profession ?? '';
  if (keyword && profession.toLowerCase().includes(keyword.toLowerCase()) && !tags.includes(profession)) tags.push(profession);
  return { kind: 'user', key: `${prefix}:${user.userid}`, userid: user.userid, nickname: user.nickname, uri: user.userimg ?? '', online: !!user.online, tags: tags.join(''), level };
}

export function contactRows(users: readonly UserBasic[], departments: readonly ContactDepartment[], expanded: ReadonlySet<number>, mode: 'letter' | 'department', keyword: string): { rows: ContactRow[]; count: number } {
  const members = [...new Map(users.filter((user) => !user.bot && !user.disable_at).map((user) => [user.userid, user])).values()];
  const rows: ContactRow[] = [];
  if (mode === 'letter' || keyword) {
    const filtered = members.filter((user) => matchesUser(user, keyword));
    for (const { letter, users: group } of letterGroups(filtered)) {
      rows.push({ kind: 'label', key: `letter:${letter}`, title: letter, level: 0 });
      rows.push(...group.map((user) => userRow(user, `letter:${letter}`, 0, keyword)));
    }
    return { rows, count: filtered.length };
  }
  const validIds = new Set(departments.filter((dept) => dept.id !== 0).map((dept) => dept.id));
  const direct = new Map<number, UserBasic[]>();
  for (const user of members) {
    const ids = (user.department ?? []).filter((id) => validIds.has(id));
    for (const id of new Set(ids.length ? ids : [0])) {
      if (!direct.has(id)) direct.set(id, []);
      direct.get(id)!.push(user);
    }
  }
  let hiddenBelow: number | undefined;
  for (const dept of departments) {
    if (hiddenBelow !== undefined && dept.level > hiddenBelow) continue;
    hiddenBelow = undefined;
    const open = expanded.has(dept.id);
    rows.push({ kind: 'label', key: `dept:${dept.id}`, title: dept.name, level: dept.level, department: dept.id, count: dept.count, expanded: open });
    if (!open) {
      hiddenBelow = dept.level;
      continue;
    }
    const list = [...(direct.get(dept.id) ?? [])].sort((a, b) => {
      if (a.userid === dept.owner) return -1;
      if (b.userid === dept.owner) return 1;
      const azA = (a.az ?? '').toUpperCase();
      const azB = (b.az ?? '').toUpperCase();
      return azA.localeCompare(azB) || a.userid - b.userid;
    });
    rows.push(...list.map((user) => userRow(user, `dept:${dept.id}`, dept.level, '')));
  }
  return { rows, count: members.length };
}
