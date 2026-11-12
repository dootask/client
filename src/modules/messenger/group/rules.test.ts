import { describe, expect, it } from 'vitest';

import type { Dialog } from '../../../sync/api/dialog';
import type { Member } from '../../../sync/api/group';
import { canRemove, groupPermissions, headerCommands, memberList } from './rules';

const group: Dialog = { id: 1, type: 'group', group_type: 'user', owner_id: 10, deputy_ids: [20], name: 'group' };

describe('群权限', () => {
  it('个人群群主可以管理和解散但不能退出', () => {
    expect(groupPermissions(group, 10, false)).toMatchObject({ owner: true, edit: true, rename: true, add: true, transfer: true, disband: true, exit: false, report: true });
  });
  it('管理员可以编辑和添加，不能转让解散', () => {
    expect(groupPermissions(group, 20, false)).toMatchObject({ deputy: true, edit: true, rename: true, add: true, transfer: false, disband: false, exit: true });
  });
  it('普通成员和系统管理员没有个人群管理权限', () => {
    expect(groupPermissions(group, 30, true)).toMatchObject({ edit: false, add: false, transfer: false, exit: true });
  });
  it('全员群仅系统管理员可以添加和改名', () => {
    const all = { ...group, group_type: 'all' };
    expect(groupPermissions(all, 30, true)).toMatchObject({ edit: true, rename: true, add: true, disband: false });
    expect(groupPermissions(all, 20, false)).toMatchObject({ rename: false, add: false });
  });
  it('项目任务群不可改名，不补做项目入口', () => {
    for (const type of ['project', 'task', 'department']) expect(groupPermissions({ ...group, group_type: type }, 10, false)).toMatchObject({ rename: false, add: true, transfer: false, disband: false, report: false });
  });
  it('未登录或数据未到时不开放管理', () => {
    expect(groupPermissions(undefined, 0, false)).toMatchObject({ owner: false, edit: false, add: false, anon: false });
    expect(canRemove(group, 0, 30)).toBe(false);
  });
  it('群主不能移出自己，管理员不能移出群主或其他管理员', () => {
    expect(canRemove(group, 10, 10)).toBe(false);
    expect(canRemove(group, 10, 20)).toBe(true);
    expect(canRemove(group, 20, 10)).toBe(false);
    expect(canRemove({ ...group, deputy_ids: [20, 30] }, 20, 30)).toBe(false);
    expect(canRemove(group, 20, 30)).toBe(true);
    expect(canRemove(group, 30, 20)).toBe(false);
  });
  it('匿名消息只给真人且不能发给自己', () => {
    const dm = { id: 2, type: 'user', dialog_user: { userid: 30 } };
    expect(groupPermissions(dm, 10, false).anon).toBe(true);
    expect(groupPermissions(dm, 30, false).anon).toBe(false);
    expect(groupPermissions({ ...dm, bot: 30 }, 10, false).anon).toBe(false);
  });
});

describe('菜单', () => {
  it('按旧版群主和普通成员顺序输出', () => {
    expect(headerCommands(group, 10, false)).toEqual(['search', 'info', 'edit', 'transfer', 'report', 'disband']);
    expect(headerCommands({ ...group, group_type: 'project' }, 30, false)).toEqual(['search', 'info', 'report', 'exit']);
    expect(headerCommands({ ...group, group_type: 'all' }, 30, true)).toEqual(['search', 'info', 'edit', 'report', 'exit']);
  });
  it('单聊不创建信息侧栏；只有 AI 系统机器人有提示词', () => {
    expect(headerCommands({ id: 2, type: 'user', bot: 0 }, 10, false)).toEqual(['search', 'detail', 'create', 'report']);
    expect(headerCommands({ id: 2, type: 'user', bot: 50, email: 'worker@bot.system' }, 10, false)).not.toContain('prompt');
    expect(headerCommands({ id: 2, type: 'user', bot: 50, email: 'ai-helper@bot.system' }, 10, false)).toContain('prompt');
  });
});

describe('成员排序与搜索', () => {
  const members: Member[] = [
    { userid: 30, nickname: 'Alpha', email: 'alpha@example.test', pinyin: 'ali', created_at: '2026-01-02' },
    { userid: 20, nickname: 'Deputy', created_at: '2026-01-04' },
    { userid: 40, nickname: 'Beta', created_at: '2026-01-01' },
    { userid: 10, nickname: 'Owner', created_at: '2026-01-05' },
  ];
  it('群主→管理员→入群时间，且不修改原列表', () => {
    expect(memberList(members, group, '').map((m) => m.userid)).toEqual([10, 20, 40, 30]);
    expect(members.map((m) => m.userid)).toEqual([30, 20, 40, 10]);
  });
  it('昵称邮箱拼音搜索忽略大小写和首尾空格', () => {
    for (const key of [' ALPHA ', 'example.test', 'ALI']) expect(memberList(members, group, key).map((m) => m.userid)).toEqual([30]);
    expect(memberList(members, group, 'unknown')).toEqual([]);
    expect(memberList([{ userid: 1 }], undefined, '')).toEqual([{ userid: 1 }]);
  });
});
