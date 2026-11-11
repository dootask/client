import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Building2, ChevronLeft, Layers, Search, Users } from 'lucide-react-native';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, type GestureResponderEvent, Text, View } from 'react-native';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { haptics } from '../../../platform/haptics';
import { Icon } from '../../../ui/Icon';
import { Sheet } from '../../../ui/layout';
import { SearchField } from '../../../ui/SearchField';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { useErrorText } from '../../session';
import { useMessenger } from '../hooks';
import { isGroup, loadMembers, loadSources, pickKey, type PickSources, type PickUser, type Picked, recentsOf, searchUsers } from './pickerData';
import { type Entry, EntryPanel, MemberBar, PickerFooter, PickRow, SectionHeader, SelectedSheet, SourceRow } from './pickerParts';

const SEARCH_DELAY = 300;
const PAGE_SLIDE = 250;

type MemberKey = 'all' | `dept:${number}` | `proj:${number}`;
type PageKey = 'home' | 'depts' | 'projs' | MemberKey;

interface MemberState {
  list: PickUser[];
  page: number;
  last: number;
  total: number | null;
  loading: boolean;
}

const EMPTY_MEMBERS: MemberState = { list: [], page: 0, last: 1, total: null, loading: false };

type Row =
  | { type: 'header'; id: string; title: string }
  | { type: 'pick'; id: string; item: Picked }
  | { type: 'source'; id: string; key: MemberKey; name: string; count: number; badge: number; level: number; project: boolean; color: string };

function isMemberKey(key: PageKey | string): key is MemberKey {
  return key === 'all' || key.startsWith('dept:') || key.startsWith('proj:');
}

const rowKey = (row: Row) => row.id;
const rowType = (row: Row) => row.type;

/**
 * 选会话（转发，旧版 App 的 UserPicker 选会话模式）：首页是入口（全部成员、按部门、按项目）和最近会话，逐级点进成员列表，
 * 任何一级都能搜（成员、最近会话里的群、部门和项目）。人和群都能选，最多 max 个；点「确定」交给 onSubmit，弹层不关。
 * 返回键、下拉、点遮罩先退出搜索、退回上一级
 */
export function DialogPicker({ visible, title, max, onSubmit, onClose }: {
  visible: boolean;
  title: string;
  max: number;
  onSubmit: (picked: Picked[]) => void;
  onClose: () => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const errorText = useErrorText();
  const messenger = useMessenger();
  const [selected, setSelected] = useState<Picked[]>([]);
  // move：怎么到的当前页，刚打开不动，往里走从右滑入，返回从左滑入
  const [pages, setPages] = useState<{ stack: PageKey[]; move: 'open' | 'forward' | 'back' }>({ stack: ['home'], move: 'open' });
  const [key, setKey] = useState('');
  // 最近会话取打开时的会话缓存，选的时候不跟着新消息重排
  const [recents] = useState(() => recentsOf(messenger?.store.getState().dialogs ?? {}));
  const [sources, setSources] = useState<PickSources | 'failed' | null>(null);
  const [members, setMembers] = useState<Record<string, MemberState>>({});
  const [results, setResults] = useState<Record<string, PickUser[] | 'failed'>>({});
  const [showSelected, setShowSelected] = useState(false);
  const membersRef = useRef(members);
  const selectedRef = useRef(selected);
  useLayoutEffect(() => {
    selectedRef.current = selected;
  });
  const listRef = useRef<FlashListRef<Row>>(null);
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

  // 搜索：同一个词只请求一次
  useEffect(() => {
    if (!word || results[word]) return;
    let stale = false;
    const timer = setTimeout(() => {
      searchUsers(word).then(
        (list) => !stale && setResults((current) => ({ ...current, [word]: list })),
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

  // 来源里已选的人数：项目按成员名单，部门、全部成员按已取回的人
  const selectedIn = (memberKey: MemberKey) => {
    if (memberKey.startsWith('proj:')) return (projectOf(Number(memberKey.slice(5)))?.userids ?? []).filter((id) => selectedIds.has(id)).length;
    return (members[memberKey]?.list ?? []).filter((user) => selectedIds.has(user.userid)).length;
  };

  const titleOf = (pageKey: PageKey) => {
    if (pageKey === 'home') return title;
    if (pageKey === 'depts') return t('messenger:picker.department');
    if (pageKey === 'projs') return t('messenger:picker.project');
    if (pageKey === 'all') return t('messenger:picker.all');
    const id = Number(pageKey.slice(5));
    return (pageKey.startsWith('dept:') ? departmentOf(id)?.name : projectOf(id)?.name) ?? '';
  };

  const colors = theme.palette.pickSource;
  const departmentRows = (match?: string): Row[] =>
    (loaded?.departments ?? [])
      .map((dept, index) => ({ dept, color: dept.id === 0 ? colors.noDepartment : colors.departments[index % colors.departments.length]! }))
      .filter(({ dept }) => !match || dept.name.toLowerCase().includes(match))
      .map(({ dept, color }) => {
        const memberKey = `dept:${dept.id}` as const;
        return { type: 'source', id: memberKey, key: memberKey, name: dept.name, count: dept.count, badge: selectedIn(memberKey), level: match ? 0 : dept.level, project: false, color };
      });
  const projectRows = (match?: string): Row[] =>
    (loaded?.projects ?? [])
      .filter((project) => !match || project.name.toLowerCase().includes(match))
      .map((project) => {
        const memberKey = `proj:${project.id}` as const;
        return { type: 'source', id: memberKey, key: memberKey, name: project.name, count: project.userids.length, badge: selectedIn(memberKey), level: 0, project: true, color: colors.project };
      });
  const pickRows = (list: Picked[], prefix: string): Row[] => list.map((item) => ({ type: 'pick', id: `${prefix}${pickKey(item)}`, item }));

  // 当前页的行；sticky 为吸顶的分节标题，letters 为有字母索引
  const view = (() => {
    const rows: Row[] = [];
    let loading = false;
    let empty = '';
    let letters = false;
    if (word) {
      const found = results[word];
      const lower = word.toLowerCase();
      const sourcesFound = [...departmentRows(lower), ...projectRows(lower)];
      const groupsFound = recents.filter((item) => isGroup(item) && item.match.includes(lower));
      if (Array.isArray(found) && found.length > 0) rows.push({ type: 'header', id: 'h-users', title: t('messenger:picker.members') }, ...pickRows(found, 's-'));
      if (groupsFound.length > 0) rows.push({ type: 'header', id: 'h-groups', title: t('messenger:picker.groups') }, ...pickRows(groupsFound, 's-'));
      if (sourcesFound.length > 0) rows.push({ type: 'header', id: 'h-sources', title: t('messenger:picker.sources') }, ...sourcesFound);
      loading = found === undefined;
      if (!loading && rows.length === 0) empty = found === 'failed' ? t('loadFailed') : t('messenger:picker.notFound', { key: word });
    } else if (page === 'home') {
      // 没有最近会话时整块不显示，只留入口
      if (recents.length) rows.push({ type: 'header', id: 'h-recent', title: t('messenger:picker.recentDialogs') }, ...pickRows(recents, 'r-'));
    } else if (page === 'depts' || page === 'projs') {
      rows.push(...(page === 'depts' ? departmentRows() : projectRows()));
      loading = sources === null;
      if (!loading && rows.length === 0) empty = sources === 'failed' ? t('loadFailed') : t('none');
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
      if (!loading && state.page > 0 && rows.length === 0) empty = t('none');
    }
    const sticky = word || page === 'all' ? rows.flatMap((row, index) => (row.type === 'header' ? [index] : [])) : undefined;
    return { rows, loading, empty, letters, sticky };
  })();

  // 成员页顶部：人数和已选数
  const memberBar = (() => {
    if (word || !isMemberKey(page)) return null;
    const state = members[page] ?? EMPTY_MEMBERS;
    const id = Number(page.slice(5));
    const total = state.total ?? (page === 'all' ? loaded?.total : page.startsWith('dept:') ? departmentOf(id)?.count : projectOf(id)?.userids.length) ?? 0;
    const count = page === 'all' ? selectedIds.size : selectedIn(page);
    return `${t('messenger:picker.people', { n: total })}${count > 0 ? ` · ${t('messenger:picker.selected')} ${count}` : ''}`;
  })();

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
      if (word) {
        // 从搜索结果进部门、项目：退出搜索，返回时经过它的列表
        setKey('');
        setPages({ stack: ['home', memberKey.startsWith('dept:') ? 'depts' : 'projs', memberKey], move: 'forward' });
        nextMembers(memberKey);
        return;
      }
      push(memberKey);
    };
  });
  const openSource = useCallback((memberKey: string) => openSourceRef.current(memberKey), []);

  // 字母索引：点或拖到字母，列表滚到那一组
  const letterRows = view.letters ? view.rows.flatMap((row, index) => (row.type === 'header' ? [{ title: row.title, index }] : [])) : [];
  const letterAt = useRef('');
  const onLetter = (event: GestureResponderEvent) => {
    const index = Math.floor(event.nativeEvent.locationY / theme.size.pickLetter);
    const target = letterRows[Math.max(0, Math.min(letterRows.length - 1, index))];
    if (!target || target.title === letterAt.current) return;
    letterAt.current = target.title;
    listRef.current?.scrollToIndex({ index: target.index, animated: false });
    haptics.selection();
  };

  // 返回键、下拉、点遮罩：先退出搜索、退回上一级
  const back = () => {
    if (word) setKey('');
    else if (depth > 1) pop();
    else onClose();
  };

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if (item.type === 'header') return <SectionHeader title={item.title} />;
      if (item.type === 'source') {
        return (
          <SourceRow
            sourceKey={item.key}
            name={item.name}
            count={item.count}
            badge={item.badge}
            icon={item.project ? Layers : Building2}
            color={item.color}
            level={item.level}
            word={word}
            onOpen={openSource}
          />
        );
      }
      return <PickRow item={item.item} word={word} on={selectedKeys.has(pickKey(item.item))} onToggle={toggle} />;
    },
    [word, selectedKeys, toggle, openSource],
  );

  const homeHeader = page === 'home' && !word;
  return (
    <>
      <Sheet
        visible={visible}
        onClose={back}
        title={word ? t('messenger:search') : titleOf(page)}
        fill
        left={
          word || depth > 1 ? (
            <Touchable accessibilityRole="button" onPress={back} hitSlop={theme.spacing.sm} style={({ pressed }) => styles.back(pressed)}>
              <Icon icon={ChevronLeft} color={theme.colors.text2} size={theme.size.icon} />
              <Text style={styles.backText} numberOfLines={1}>
                {titleOf(word ? page : pages.stack[depth - 2]!)}
              </Text>
            </Touchable>
          ) : (
            <Touchable accessibilityRole="button" onPress={onClose} hitSlop={theme.spacing.sm} style={({ pressed }) => styles.back(pressed)}>
              <Text style={styles.backText}>{t('cancel')}</Text>
            </Touchable>
          )
        }
      >
        <View style={styles.search}>
          <SearchField value={key} onChangeText={setKey} placeholder={t('messenger:picker.searchDialogs')} clearLabel={t('clear')} />
        </View>
        <Animated.View
          key={word ? 'search' : `${depth}-${page}`}
          entering={word || pages.move === 'open' ? undefined : (pages.move === 'back' ? SlideInLeft : SlideInRight).duration(PAGE_SLIDE)}
          style={styles.page}
        >
          {memberBar !== null && <MemberBar text={memberBar} />}
          <FlashList
            ref={listRef}
            data={view.rows}
            keyExtractor={rowKey}
            getItemType={rowType}
            renderItem={renderItem}
            extraData={renderItem}
            stickyHeaderIndices={view.sticky}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onEndReached={() => !word && isMemberKey(page) && nextMembers(page)}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={homeHeader ? <EntryPanel entries={entries} onPress={(entry) => push(entry as PageKey)} /> : undefined}
            ListFooterComponent={
              view.loading ? (
                <ActivityIndicator style={styles.loading} color={theme.colors.text3} />
              ) : view.empty ? (
                <View style={styles.empty}>
                  <Icon icon={Search} color={theme.colors.text3} size={theme.size.pickEmptyIcon} />
                  <Text style={styles.emptyText}>{view.empty}</Text>
                </View>
              ) : undefined
            }
            contentContainerStyle={letterRows.length > 0 ? styles.withIndex : undefined}
          />
          {letterRows.length > 1 && (
            <View style={styles.index} pointerEvents="box-none">
              <View
                onStartShouldSetResponder={() => true}
                onResponderGrant={onLetter}
                onResponderMove={onLetter}
                onResponderRelease={() => {
                  letterAt.current = '';
                }}
              >
                <View pointerEvents="none">
                  {letterRows.map((letter) => (
                    <Text key={letter.title} style={styles.letter} allowFontScaling={false}>
                      {letter.title}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          )}
        </Animated.View>
        <PickerFooter selected={selected} max={max} onOpen={() => setShowSelected(true)} onSubmit={() => onSubmit(selected)} />
      </Sheet>
      <SelectedSheet
        visible={visible && showSelected}
        selected={selected}
        max={max}
        onRemove={(itemKey) => {
          const rest = selected.filter((item) => pickKey(item) !== itemKey);
          setSelected(rest);
          if (rest.length === 0) setShowSelected(false);
        }}
        onClear={() => setSelected([])}
        onClose={() => setShowSelected(false)}
      />
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  back: (pressed: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.spacing.xs,
    opacity: pressed ? theme.opacity.pressedIcon : 1,
  }),
  backText: { ...theme.typography.callout, flexShrink: 1, color: theme.colors.text2 },
  search: { paddingHorizontal: theme.spacing.page, paddingBottom: theme.spacing.sm },
  page: { flex: 1 },
  withIndex: { paddingRight: theme.spacing.lg },
  loading: { marginVertical: theme.spacing.xxl },
  empty: { alignItems: 'center', gap: theme.spacing.sm, paddingTop: theme.size.pickEmptyTop, paddingHorizontal: theme.spacing.lg },
  emptyText: { ...theme.typography.subhead, color: theme.colors.text3 },
  index: {
    position: 'absolute',
    right: theme.size.pickLetterInset,
    top: 0,
    bottom: 0,
    width: theme.size.pickLetterWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    ...theme.typography.caption2,
    height: theme.size.pickLetter,
    lineHeight: theme.size.pickLetter,
    width: theme.size.pickLetterWidth,
    textAlign: 'center',
    color: theme.colors.primaryText,
  },
}));
