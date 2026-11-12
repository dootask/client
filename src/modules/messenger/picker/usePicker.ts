import { Building2, Layers, Users } from 'lucide-react-native';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { haptics } from '../../../platform/haptics';
import { showToast } from '../../../ui/Toast';
import { useErrorText } from '../../session';
import { useMessenger } from '../hooks';
import { isGroup, loadMembers, loadSources, pickKey, type PickGroup, type PickSources, type PickUser, type Picked, recentsOf, searchGroups, searchUsers } from './pickerData';
import type { Entry } from './pickerParts';

const SEARCH_DELAY = 300;

export type MemberKey = 'all' | `dept:${number}` | `proj:${number}`;
/** home：手机首页（入口 + 最近会话）；recent：宽屏左栏的「最近会话」 */
export type PageKey = 'home' | 'recent' | 'depts' | 'projs' | MemberKey;

interface MemberState {
  list: PickUser[];
  page: number;
  last: number;
  total: number | null;
  loading: boolean;
}

const EMPTY_MEMBERS: MemberState = { list: [], page: 0, last: 1, total: null, loading: false };

export interface SourceItem {
  key: MemberKey;
  name: string;
  count: number;
  /** 已选人数 */
  badge: number;
  level: number;
  project: boolean;
  color: string;
}

export type PickerRow =
  | { type: 'header'; id: string; title: string }
  | { type: 'pick'; id: string; item: Picked }
  | ({ type: 'source'; id: string } & SourceItem);

/** 列表为空的原因：没有内容、加载失败、搜不到 */
export type PickerEmpty = '' | 'none' | 'failed' | 'notFound';

export function isMemberKey(key: PageKey | string): key is MemberKey {
  return key === 'all' || key.startsWith('dept:') || key.startsWith('proj:');
}

/**
 * 选会话的状态（App 弹层和 Web 选人弹窗共用）：已选、页面栈、搜索、部门项目和成员分页，以及当前页的行。
 * flat 为宽屏：来源平铺在左栏，点来源直接换页（栈只有一层），不逐级进入
 */
export function usePicker({ title, max, root, flat }: { title: string; max: number; root: PageKey; flat: boolean }) {
  const t = useT();
  const { theme } = useUnistyles();
  const errorText = useErrorText();
  const messenger = useMessenger();
  const [selected, setSelected] = useState<Picked[]>([]);
  // move：怎么到的当前页，刚打开不动，往里走从右滑入，返回从左滑入
  const [pages, setPages] = useState<{ stack: PageKey[]; move: 'open' | 'forward' | 'back' }>({ stack: [root], move: 'open' });
  const [key, setKey] = useState('');
  // 最近会话取打开时的会话缓存，选的时候不跟着新消息重排
  const [recents] = useState(() => recentsOf(messenger?.store.getState().dialogs ?? {}));
  const [sources, setSources] = useState<PickSources | 'failed' | null>(null);
  const [members, setMembers] = useState<Record<string, MemberState>>({});
  const [results, setResults] = useState<Record<string, { users: PickUser[]; groups: PickGroup[] } | 'failed'>>({});
  const membersRef = useRef(members);
  const selectedRef = useRef(selected);
  useLayoutEffect(() => {
    selectedRef.current = selected;
  });
  const page = pages.stack[pages.stack.length - 1]!;
  const depth = pages.stack.length;
  const word = key.trim();

  useEffect(() => {
    loadSources(t('messenger:picker.noDepartment')).then(setSources, () => setSources('failed'));
  }, [t]);

  const loaded = sources && sources !== 'failed' ? sources : null;
  const departmentOf = useCallback((id: number) => loaded?.departments.find((dept) => dept.id === id), [loaded]);
  const projectOf = useCallback((id: number) => loaded?.projects.find((project) => project.id === id), [loaded]);
  const selectedKeys = useMemo(() => new Set(selected.map(pickKey)), [selected]);
  // 选中的人（来源里的已选数按人算）
  const selectedIds = useMemo(() => new Set(selected.flatMap((item) => (isGroup(item) ? [] : [item.userid]))), [selected]);

  const updateMembers = (memberKey: MemberKey, state: MemberState) => {
    membersRef.current = { ...membersRef.current, [memberKey]: state };
    setMembers(membersRef.current);
  };

  // 成员列表的下一页（进入时取第一页，滚到底再取）
  const nextMembers = (memberKey: MemberKey) => {
    const state = membersRef.current[memberKey] ?? EMPTY_MEMBERS;
    if (state.loading || state.page >= state.last) return;
    updateMembers(memberKey, { ...state, loading: true });
    const id = Number(memberKey.slice(5));
    const params = memberKey.startsWith('dept:') ? { departments: departmentOf(id)?.ids ?? [id] } : memberKey.startsWith('proj:') ? { project_id: id } : {};
    loadMembers({ ...params, page: state.page + 1 }).then(
      (data) => {
        const current = membersRef.current[memberKey]!;
        updateMembers(memberKey, { list: [...current.list, ...data.list], page: data.page, last: data.last, total: data.total, loading: false });
      },
      (err) => {
        const current = membersRef.current[memberKey]!;
        updateMembers(memberKey, { ...current, last: current.page, loading: false });
        showToast(errorText(err));
      },
    );
  };

  const push = (next: PageKey) => {
    setKey('');
    setPages(({ stack }) => ({ stack: [...stack, next], move: 'forward' }));
    if (isMemberKey(next)) nextMembers(next);
  };
  const pop = () => setPages(({ stack }) => ({ stack: stack.slice(0, -1), move: 'back' }));
  /** 换成另一组页面（宽屏点左栏、从搜索结果进部门项目） */
  const jump = (stack: PageKey[]) => {
    setKey('');
    setPages({ stack, move: flat ? 'open' : 'forward' });
    const last = stack[stack.length - 1]!;
    if (isMemberKey(last)) nextMembers(last);
  };

  // 搜索：成员和群一起向服务端搜，同一个词只请求一次
  useEffect(() => {
    if (!word || results[word]) return;
    let stale = false;
    const timer = setTimeout(() => {
      Promise.all([searchUsers(word), searchGroups(word)]).then(
        ([users, groups]) => !stale && setResults((current) => ({ ...current, [word]: { users, groups } })),
        () => !stale && setResults((current) => ({ ...current, [word]: 'failed' })),
      );
    }, SEARCH_DELAY);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [word, results]);

  const toggle = useCallback(
    (item: Picked) => {
      const current = selectedRef.current;
      const itemKey = pickKey(item);
      if (current.some((one) => pickKey(one) === itemKey)) {
        setSelected(current.filter((one) => pickKey(one) !== itemKey));
      } else if (current.length >= max) {
        showToast(t('messenger:picker.overMax'));
        return;
      } else {
        setSelected([...current, item]);
      }
      haptics.selection();
    },
    [max, t],
  );
  const remove = useCallback((itemKey: string) => setSelected((current) => current.filter((item) => pickKey(item) !== itemKey)), []);
  const clear = useCallback(() => setSelected([]), []);

  // 来源里已选的人数：项目按成员名单，部门、全部成员按已取回的人
  const selectedIn = (memberKey: MemberKey) => {
    if (memberKey.startsWith('proj:')) return (projectOf(Number(memberKey.slice(5)))?.userids ?? []).filter((id) => selectedIds.has(id)).length;
    return (members[memberKey]?.list ?? []).filter((user) => selectedIds.has(user.userid)).length;
  };

  const titleOf = (pageKey: PageKey) => {
    if (pageKey === 'home') return title;
    if (pageKey === 'recent') return t('messenger:picker.recentDialogs');
    if (pageKey === 'depts') return t('messenger:picker.department');
    if (pageKey === 'projs') return t('messenger:picker.project');
    if (pageKey === 'all') return t('messenger:picker.all');
    const id = Number(pageKey.slice(5));
    return (pageKey.startsWith('dept:') ? departmentOf(id)?.name : projectOf(id)?.name) ?? '';
  };

  const colors = theme.palette.pickSource;
  const departmentItems = (match?: string): SourceItem[] =>
    (loaded?.departments ?? [])
      .map((dept, index) => ({ dept, color: dept.id === 0 ? colors.noDepartment : colors.departments[index % colors.departments.length]! }))
      .filter(({ dept }) => !match || dept.name.toLowerCase().includes(match))
      .map(({ dept, color }) => {
        const memberKey = `dept:${dept.id}` as const;
        return { key: memberKey, name: dept.name, count: dept.count, badge: selectedIn(memberKey), level: match ? 0 : dept.level, project: false, color };
      });
  const projectItems = (match?: string): SourceItem[] =>
    (loaded?.projects ?? [])
      .filter((project) => !match || project.name.toLowerCase().includes(match))
      .map((project) => {
        const memberKey = `proj:${project.id}` as const;
        return { key: memberKey, name: project.name, count: project.userids.length, badge: selectedIn(memberKey), level: 0, project: true, color: colors.project };
      });
  const sourceRows = (list: SourceItem[]): PickerRow[] => list.map((item) => ({ type: 'source', id: item.key, ...item }));
  const pickRows = (list: Picked[], prefix: string): PickerRow[] => list.map((item) => ({ type: 'pick', id: `${prefix}${pickKey(item)}`, item }));

  // 当前页的行；sticky 为吸顶的分节标题，letters 为有字母索引，empty 为空列表的原因
  const view = (() => {
    const rows: PickerRow[] = [];
    let loading = false;
    let empty: PickerEmpty = '';
    let letters = false;
    if (word) {
      const found = results[word];
      const lower = word.toLowerCase();
      const sourcesFound = sourceRows([...departmentItems(lower), ...projectItems(lower)]);
      // 群：本地最近会话里按名字和拼音匹配的在前，再补服务端搜到、本地没有的
      const localGroups = recents.filter((item) => isGroup(item) && item.match.includes(lower));
      const localKeys = new Set(localGroups.map(pickKey));
      const serverGroups = found && found !== 'failed' ? found.groups.filter((item) => !localKeys.has(pickKey(item))) : [];
      const groupsFound = [...localGroups, ...serverGroups];
      if (found && found !== 'failed' && found.users.length > 0) rows.push({ type: 'header', id: 'h-users', title: t('messenger:picker.members') }, ...pickRows(found.users, 's-'));
      if (groupsFound.length > 0) rows.push({ type: 'header', id: 'h-groups', title: t('messenger:picker.groups') }, ...pickRows(groupsFound, 's-'));
      if (sourcesFound.length > 0) rows.push({ type: 'header', id: 'h-sources', title: t('messenger:picker.sources') }, ...sourcesFound);
      loading = found === undefined;
      if (!loading && rows.length === 0) empty = found === 'failed' ? 'failed' : 'notFound';
    } else if (page === 'home') {
      // 没有最近会话时整块不显示，只留入口
      if (recents.length) rows.push({ type: 'header', id: 'h-recent', title: t('messenger:picker.recentDialogs') }, ...pickRows(recents, 'r-'));
    } else if (page === 'recent') {
      rows.push(...pickRows(recents, 'r-'));
      if (rows.length === 0) empty = 'none';
    } else if (page === 'depts' || page === 'projs') {
      rows.push(...sourceRows(page === 'depts' ? departmentItems() : projectItems()));
      loading = sources === null;
      if (!loading && rows.length === 0) empty = sources === 'failed' ? 'failed' : 'none';
    } else {
      const state = members[page] ?? EMPTY_MEMBERS;
      loading = state.loading;
      if (page === 'all') {
        // 按拼音首字母分组，非字母开头的归到最后的「#」（同通讯录习惯）
        const others: PickUser[] = [];
        let letter = '';
        state.list.forEach((user) => {
          if (!/^[A-Z]$/.test(user.az)) {
            others.push(user);
            return;
          }
          if (user.az !== letter) {
            letter = user.az;
            rows.push({ type: 'header', id: `az-${letter}`, title: letter });
          }
          rows.push({ type: 'pick', id: `u-${user.userid}`, item: user });
        });
        if (others.length > 0) rows.push({ type: 'header', id: 'az-#', title: '#' }, ...pickRows(others, 'u-'));
        letters = true;
      } else {
        rows.push(...pickRows(state.list, 'u-'));
      }
      if (!loading && state.page > 0 && rows.length === 0) empty = 'none';
    }
    const sticky = word || page === 'all' ? rows.flatMap((row, index) => (row.type === 'header' ? [index] : [])) : undefined;
    return { rows, loading, empty, letters, sticky };
  })();

  // 成员页的人数和其中已选的人数
  const memberInfo = (() => {
    if (word || !isMemberKey(page)) return null;
    const state = members[page] ?? EMPTY_MEMBERS;
    const id = Number(page.slice(5));
    const total = state.total ?? (page === 'all' ? loaded?.total : page.startsWith('dept:') ? departmentOf(id)?.count : projectOf(id)?.userids.length) ?? 0;
    return { total, count: page === 'all' ? selectedIds.size : selectedIn(page) };
  })();

  // 手机首页入口
  const entries = ((): Entry[] => {
    const deptIds = new Set((loaded?.departments ?? []).flatMap((dept) => (members[`dept:${dept.id}`]?.list ?? []).map((user) => user.userid)));
    const projIds = new Set((loaded?.projects ?? []).flatMap((project) => project.userids));
    const count = (ids: Set<number>) => [...ids].filter((id) => selectedIds.has(id)).length;
    return [
      { key: 'all', name: t('messenger:picker.all'), icon: Users, color: colors.all, count: loaded?.total, badge: 0 },
      { key: 'depts', name: t('messenger:picker.byDepartment'), icon: Building2, color: colors.departmentEntry, badge: count(deptIds) },
      { key: 'projs', name: t('messenger:picker.byProject'), icon: Layers, color: colors.project, badge: count(projIds) },
    ];
  })();

  // 行里的回调要稳定：经 ref 调到最新的处理
  const openSourceRef = useRef<(memberKey: string) => void>(() => {});
  useLayoutEffect(() => {
    openSourceRef.current = (memberKey) => {
      if (!isMemberKey(memberKey)) return;
      // 宽屏直接换页；窄屏从搜索结果进部门、项目时退出搜索，返回时经过它的列表
      if (flat) jump([memberKey]);
      else if (word) jump([root, memberKey.startsWith('dept:') ? 'depts' : 'projs', memberKey]);
      else push(memberKey);
    };
  });
  const openSource = useCallback((memberKey: string) => openSourceRef.current(memberKey), []);

  return {
    selected,
    selectedKeys,
    toggle,
    remove,
    clear,
    pages,
    page,
    depth,
    push,
    pop,
    jump,
    key,
    setKey,
    word,
    loaded,
    nextMembers,
    titleOf,
    departmentItems,
    projectItems,
    view,
    memberInfo,
    entries,
    openSource,
  };
}
