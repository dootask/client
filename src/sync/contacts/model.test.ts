import { describe, expect, it } from 'vitest';

import type { Departments } from '../api/contacts';
import type { UserBasic } from '../api/users';
import { contactRows, departmentGroups, initialExpanded, type ContactRow } from './model';

const user = (userid: number, extra: Partial<UserBasic> = {}): UserBasic => ({ userid, nickname: `成员${userid}`, ...extra });
const data: Departments = {
  departments: [
    { id: 30, name: '研发', level: 0, total_count: 5, owner_userid: 9 },
    { id: 31, name: '客户端', level: 1, total_count: 2 },
    { id: 32, name: '移动端', level: 2, total_count: 1 },
    { id: 33, name: '服务端', level: 1, total_count: 1 },
    { id: 10, name: '行政', level: 0, total_count: 1 },
  ],
  no_department_count: 2,
  total: 8,
};
const groups = departmentGroups(data);
const expanded = new Set(groups.map((dept) => dept.id));
const users = [
  user(2, { az: 'A', department: [30] }),
  user(9, { az: 'Z', department: [30] }),
  user(3, { az: 'B', department: [31] }),
  user(4, { az: 'C', department: [32] }),
  user(5, { az: 'D', department: [33] }),
  user(6, { az: 'L', department: [10] }),
  user(7, { department: [] }),
  user(8, { department: [999] }),
];
const userRows = (rows: ContactRow[]) => rows.filter((row) => row.kind === 'user');
const directIds = (rows: ContactRow[], id: number) => userRows(rows).filter((row) => row.key.startsWith(`dept:${id}:`)).map((row) => row.userid);

describe('通讯录部门', () => {
  it('深度优先保留后端顺序，人数含下级，默认部门最后', () => {
    expect(groups).toEqual([
      { id: 30, name: '研发', level: 0, count: 5, owner: 9, ids: [30, 31, 32, 33] },
      { id: 31, name: '客户端', level: 1, count: 2, owner: 0, ids: [31, 32] },
      { id: 32, name: '移动端', level: 2, count: 1, owner: 0, ids: [32] },
      { id: 33, name: '服务端', level: 1, count: 1, owner: 0, ids: [33] },
      { id: 10, name: '行政', level: 0, count: 1, owner: 0, ids: [10] },
      { id: 0, name: '', level: 0, count: 2, owner: 0, ids: [0] },
    ]);
  });

  it.each([undefined, null, 0])('没有未分部门成员时不追加默认部门：%s', (count) => {
    expect(departmentGroups({ departments: data.departments, no_department_count: count })).toHaveLength(5);
  });

  it('部门缺失字段使用空名、一级和零计数', () => {
    expect(departmentGroups({ departments: [{ id: 1, name: null, level: null, total_count: null, owner_userid: null }] })).toEqual([
      { id: 1, name: '', level: 0, count: 0, owner: 0, ids: [1] },
    ]);
  });

  it('初始只展开一级真实部门，二级及默认部门折叠', () => {
    const open = initialExpanded(groups);
    expect([...open]).toEqual([30, 10]);
    expect(contactRows(users, groups, open, 'department', '').rows.map((row) => row.key)).toEqual([
      'dept:30', 'dept:30:9', 'dept:30:2', 'dept:31', 'dept:33', 'dept:10', 'dept:10:6', 'dept:0',
    ]);
  });

  it('没有真实部门时默认部门展开', () => {
    const defaults = departmentGroups({ departments: [], no_department_count: 1 });
    expect([...initialExpanded(defaults)]).toEqual([0]);
    expect(contactRows([user(1)], defaults, initialExpanded(defaults), 'department', '').rows.map((row) => row.key)).toEqual(['dept:0', 'dept:0:1']);
    expect([...initialExpanded([])]).toEqual([]);
  });
});

describe('通讯录行', () => {
  it('部门行沿深度优先排列，只显示直属成员，负责人优先', () => {
    const result = contactRows(users, groups, expanded, 'department', '');
    expect(result.count).toBe(8);
    expect(result.rows.map((row) => row.key)).toEqual([
      'dept:30', 'dept:30:9', 'dept:30:2', 'dept:31', 'dept:31:3', 'dept:32', 'dept:32:4',
      'dept:33', 'dept:33:5', 'dept:10', 'dept:10:6', 'dept:0', 'dept:0:7', 'dept:0:8',
    ]);
    expect(result.rows[0]).toMatchObject({ kind: 'label', department: 30, count: 5, expanded: true });
    expect(directIds(result.rows, 30)).toEqual([9, 2]);
    expect(result.rows.find((row) => row.key === 'dept:32:4')).toMatchObject({ level: 2 });
  });

  it('负责人先于字母排序，其余同字母按用户编号排序', () => {
    const members = [user(3, { az: 'b', department: [30] }), user(9, { az: 'Z', department: [30] }), user(2, { az: 'B', department: [30] }), user(1, { az: 'A', department: [30] })];
    expect(directIds(contactRows(members, groups, expanded, 'department', '').rows, 30)).toEqual([9, 1, 2, 3]);
  });

  it('没有有效部门编号归默认，有效与无效混合时只归有效部门', () => {
    const members = [
      user(1), user(2, { department: null }), user(3, { department: [] }),
      user(4, { department: [999] }), user(5, { department: [0, -1] }),
      user(6, { department: [999, 30, 30] }),
    ];
    const result = contactRows(members, groups, expanded, 'department', '');
    expect(directIds(result.rows, 0)).toEqual([1, 2, 3, 4, 5]);
    expect(directIds(result.rows, 30)).toEqual([6]);
    expect(result.count).toBe(6);
  });

  it('折叠父部门隐藏整个子树，即使子部门标记展开', () => {
    const open = new Set(expanded);
    open.delete(30);
    const result = contactRows(users, groups, open, 'department', '');
    expect(result.rows.map((row) => row.key)).toEqual(['dept:30', 'dept:10', 'dept:10:6', 'dept:0', 'dept:0:7', 'dept:0:8']);
    expect(result.rows[0]).toMatchObject({ expanded: false, count: 5 });
    expect(result.count).toBe(8);
  });

  it('折叠二级隐藏孙部门但保留同级及后续一级部门', () => {
    const open = new Set(expanded);
    open.delete(31);
    expect(contactRows(users, groups, open, 'department', '').rows.map((row) => row.key)).toEqual([
      'dept:30', 'dept:30:9', 'dept:30:2', 'dept:31', 'dept:33', 'dept:33:5', 'dept:10', 'dept:10:6', 'dept:0', 'dept:0:7', 'dept:0:8',
    ]);
  });

  it('跨部门成员各显示一次，重复记录及部门编号不增加唯一人数', () => {
    const members = [user(1, { nickname: '旧名', department: [30, 31, 31] }), user(2, { department: [31] }), user(1, { nickname: '新名', department: [30, 31, 31] })];
    const result = contactRows(members, groups, expanded, 'department', '');
    expect(userRows(result.rows).map((row) => row.key)).toEqual(['dept:30:1', 'dept:31:1', 'dept:31:2']);
    expect(userRows(result.rows).filter((row) => row.userid === 1).map((row) => row.nickname)).toEqual(['新名', '新名']);
    expect(result.count).toBe(2);
  });

  it.each([
    ['department', ''], ['letter', ''], ['department', '成员'],
  ] as const)('过滤机器人和停用成员：%s/%s', (mode, keyword) => {
    const members = [
      user(1, { bot: 0, disable_at: '', department: [30] }), user(2, { bot: 1, department: [30] }),
      user(3, { bot: 2, department: [30] }), user(4, { disable_at: '2026-01-01', department: [30] }),
      user(5, { bot: 1, disable_at: '2026-01-01', department: [30] }), user(6, { bot: null, disable_at: null, department: [30] }),
    ];
    const result = contactRows(members, groups, expanded, mode, keyword);
    expect(userRows(result.rows).map((row) => row.userid)).toEqual([1, 6]);
    expect(result.count).toBe(2);
  });

  it('字母模式将井号放最后，同组按用户编号排序去重', () => {
    const members = [user(8), user(3, { az: 'B' }), user(2, { az: 'a' }), user(1, { az: 'A' }), user(2, { az: 'A', nickname: '新名' }), user(7, { az: '1' })];
    const result = contactRows(members, groups, new Set(), 'letter', '');
    expect(result.rows.map((row) => row.key)).toEqual(['letter:A', 'letter:A:1', 'letter:A:2', 'letter:B', 'letter:B:3', 'letter:#', 'letter:#:7', 'letter:#:8']);
    expect(result.count).toBe(5);
    expect(result.rows[2]).toMatchObject({ nickname: '新名' });
  });
});

describe('通讯录搜索', () => {
  const members = [
    user(1, { nickname: '黄晓', pinyin: 'huangxiao', az: 'H', department: [30], profession: '产品设计师', tags: ['骨干'] }),
    user(2, { nickname: '李四', pinyin: 'lisi', az: 'L', department: [31] }),
    user(3, { nickname: '张建伟', pinyin: 'zhangjianwei', az: 'Z', department: [10] }),
  ];

  it.each([['黄', 1], ['ANGXI', 1], ['hx', 1], ['ls', 2], ['zjw', 3]])('中文、全拼子串及姓名首字母：%s', (keyword, userid) => {
    const result = contactRows(members, groups, new Set(), 'department', keyword);
    expect(userRows(result.rows).map((row) => row.userid)).toEqual([userid]);
    expect(result.count).toBe(1);
    expect(result.rows[0]).toMatchObject({ kind: 'label', key: `letter:${members[userid - 1]!.az}` });
    expect(result.rows.some((row) => row.kind === 'label' && row.department !== undefined)).toBe(false);
  });

  it('职位命中追加标签，不修改用户或原标签，已有职位不重复追加', () => {
    const original = structuredClone(members);
    const frozen = structuredClone(members);
    for (const member of frozen) {
      if (member.tags) Object.freeze(member.tags);
      Object.freeze(member);
    }
    Object.freeze(frozen);
    const result = contactRows(frozen, groups, expanded, 'department', '产品');
    expect(userRows(result.rows)[0]).toMatchObject({ tags: '骨干产品设计师' });
    expect(frozen).toEqual(original);
    const tagged = user(4, { profession: '产品设计师', tags: ['产品设计师'] });
    expect(userRows(contactRows([tagged], groups, expanded, 'letter', '产品').rows)[0]).toMatchObject({ tags: '产品设计师' });
    expect(userRows(contactRows(frozen, groups, expanded, 'letter', '黄').rows)[0]).toMatchObject({ tags: '骨干' });
  });

  it('清空搜索恢复原部门行和展开状态', () => {
    const open = initialExpanded(groups);
    const original = structuredClone(members);
    const before = contactRows(members, groups, open, 'department', '');
    expect(contactRows(members, groups, open, 'department', 'hx').rows[0]?.key).toBe('letter:H');
    expect(contactRows(members, groups, open, 'department', '')).toEqual(before);
    expect([...open]).toEqual([30, 10]);
    expect(members).toEqual(original);
  });

  it('无匹配搜索返回空行和零人数', () => {
    expect(contactRows(members, groups, expanded, 'department', '不存在的姓名')).toEqual({ rows: [], count: 0 });
  });
});
