import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { router, usePathname } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { dialogApi } from '../../sync/api';
import type { SearchItem } from '../../sync/api/dialog';
import { categoryUnread } from '../../sync/messenger';
import { PageHeader } from '../../ui/PageHeader';
import { SearchField } from '../../ui/SearchField';
import { showToast } from '../../ui/Toast';
import { Touchable } from '../../ui/Touchable';
import { api, useErrorText } from '../session';
import { useNow } from './clock';
import { DialogRow, ResultRow } from './DialogRow';
import { useMessenger, useMessengerState } from './hooks';
import { CATEGORIES, type ListCategory, listedIds, nextUnreadId } from './listModel';
import { AI_HIDDEN, searchRowKey, type SearchRow, useSearchRows } from './search';
import { setUnreadJumpHandler, useDialogListState } from './listState';

const CATEGORY_LABELS = {
  '': 'messenger:category.all',
  project: 'messenger:category.project',
  task: 'messenger:category.task',
  user: 'messenger:category.user',
  group: 'messenger:category.group',
  bot: 'messenger:category.bot',
  mark: 'messenger:category.mark',
  mention: 'messenger:category.mention',
} as const satisfies Record<ListCategory, string>;

/** 跳到下一个未读后高亮多久 */
const HIGHLIGHT_MS = 1500;


// 新消息把会话顶到最上面时：停在顶部附近就跟着显示新的第一行，翻到下面时保持当前位置不跳
const TOP_ANCHOR = { autoscrollToTopThreshold: 48 };


/** 当前打开的会话 id（路由 /messenger/<id>），没有为 0 */
function useOpenRouteId(): number {
  const pathname = usePathname();
  const match = /^\/messenger\/(\d+)/.exec(pathname);
  return match ? Number(match[1]) : 0;
}

export function openDialogRoute(id: number, msgId?: number) {
  router.navigate({ pathname: '/messenger/[dialogId]', params: msgId ? { dialogId: String(id), msg: String(msgId) } : { dialogId: String(id) } });
}

/** 消息首页：导航栏、搜索、分类、会话列表。窄屏是消息 Tab 的首页，并排视图里是左边的列表栏 */
export function DialogList() {
  const t = useT();
  const { category, key } = useDialogListState();
  const trimmed = key.trim();
  return (
    <View style={styles.root}>
      <PageHeader title={t('shell:tab.messenger')} />
      <View style={styles.search}>
        <SearchField value={key} onChangeText={(v) => useDialogListState.setState({ key: v })} placeholder={t('messenger:search')} clearLabel={t('clear')} />
      </View>
      {!trimmed && <Categories active={category} />}
      {trimmed ? <SearchResults keyword={trimmed} /> : category === 'mark' ? <MarkList /> : <Dialogs category={category} />}
    </View>
  );
}

const Categories = memo(function Categories({ active }: { active: ListCategory }) {
  const t = useT();
  const dialogs = useMessengerState((s) => s.dialogs);
  const counts = useMemo(() => {
    const list = Object.values(dialogs);
    const n = (c: Exclude<ListCategory, '' | 'mark' | 'mention'>) => categoryUnread(list, c);
    return { project: n('project'), task: n('task'), user: n('user'), group: n('group'), bot: n('bot') } as Partial<Record<ListCategory, number>>;
  }, [dialogs]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsBar} contentContainerStyle={styles.chips}>
      {CATEGORIES.map((c) => {
        const count = counts[c] ?? 0;
        const selected = c === active;
        return (
          <Touchable
            key={c || 'all'}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => useDialogListState.setState({ category: c })}
            style={({ pressed, hovered }) => styles.chip(selected, pressed, hovered)}
          >
            <Text style={styles.chipText(selected)} numberOfLines={1}>
              {t(CATEGORY_LABELS[c])}
              {count > 0 ? ` ${count > 999 ? '999+' : count}` : ''}
            </Text>
          </Touchable>
        );
      })}
    </ScrollView>
  );
});

/** 本地会话列表 */
function Dialogs({ category }: { category: ListCategory }) {
  const t = useT();
  const ids = useListedIds(category, '');
  const ready = useMessengerState((s) => s.ready);
  const openId = useOpenRouteId();
  const listRef = useRef<FlashListRef<number>>(null);
  const [highlight, setHighlight] = useState(0);
  const dialogs = useMessengerState((s) => s.dialogs);

  // 再点一次「消息」Tab：滚到下一个有未读的会话并高亮一下
  const state = useRef({ ids, dialogs, last: 0 });
  useEffect(() => {
    state.current.ids = ids;
    state.current.dialogs = dialogs;
  }, [ids, dialogs]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    setUnreadJumpHandler(() => {
      const s = state.current;
      const next = nextUnreadId(s.ids, s.dialogs, s.last);
      if (!next) {
        s.last = 0;
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
        return;
      }
      s.last = next;
      listRef.current?.scrollToIndex({ index: s.ids.indexOf(next), animated: true, viewPosition: 0.3 });
      setHighlight(next);
      clearTimeout(timer);
      timer = setTimeout(() => setHighlight(0), HIGHLIGHT_MS);
    });
    return () => {
      setUnreadJumpHandler(null);
      clearTimeout(timer);
    };
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: number }) => <DialogRow id={item} selected={item === openId} highlighted={item === highlight} onOpen={openDialogRoute} />,
    [openId, highlight],
  );

  if (!ready) return <Hint text={t('messenger:loading')} />;
  return (
    <FlashList
      ref={listRef}
      data={ids}
      renderItem={renderItem}
      keyExtractor={String}
      extraData={`${openId}|${highlight}`}
      maintainVisibleContentPosition={TOP_ANCHOR}
      ListEmptyComponent={<Hint text={t('messenger:empty')} />}
      keyboardShouldPersistTaps="handled"
      style={styles.list}
    />
  );
}

function useListedIds(category: ListCategory, key: string): number[] {
  const dialogs = useMessengerState((s) => s.dialogs);
  const drafts = useMessengerState((s) => s.drafts);
  const openId = useMessengerState((s) => s.openId);
  const now = useNow();
  return useMemo(() => listedIds({ dialogs, drafts, openId, aiHidden: AI_HIDDEN, now: now / 1000 }, category, key), [dialogs, drafts, openId, now, category, key]);
}

/** 搜索：先列本地匹配的会话，停顿后补上服务端搜到的联系人和消息 */
function SearchResults({ keyword }: { keyword: string }) {
  const t = useT();
  const ids = useListedIds('', keyword);
  const openId = useOpenRouteId();
  const { rows, searching } = useSearchRows(ids, keyword);

  const openResult = useOpenResult();
  const renderItem = useCallback(
    ({ item }: { item: SearchRow }) =>
      item.kind === 'dialog' ? (
        <DialogRow id={item.id} selected={item.id === openId} highlighted={false} onOpen={openDialogRoute} />
      ) : (
        <ResultRow item={item.item} onOpen={openResult} />
      ),
    [openId, openResult],
  );

  return (
    <FlashList
      data={rows}
      renderItem={renderItem}
      keyExtractor={searchRowKey}
      getItemType={(r) => r.kind}
      extraData={openId}
      ListEmptyComponent={<Hint text={searching ? t('messenger:loading') : t('messenger:noResult', { key: keyword })} />}
      keyboardShouldPersistTaps="handled"
      style={styles.list}
    />
  );
}

/** 标注：服务端最近被标注的消息，每条一行，点开定位到那条 */
function MarkList() {
  const t = useT();
  const errorText = useErrorText();
  const [items, setItems] = useState<SearchItem[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    dialogApi
      .searchTag(api)
      .then((list) => !cancelled && setItems(list))
      .catch((err) => {
        if (cancelled) return;
        setItems([]);
        showToast(errorText(err));
      });
    return () => {
      cancelled = true;
    };
  }, [errorText]);
  const openResult = useOpenResult();
  const renderItem = useCallback(({ item }: { item: SearchItem }) => <ResultRow item={item} onOpen={openResult} />, [openResult]);
  if (!items) return <Hint text={t('messenger:loading')} />;
  return (
    <FlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => `${item.id}:${item.search_msg_id ?? ''}`}
      ListEmptyComponent={<Hint text={t('messenger:empty')} />}
      style={styles.list}
    />
  );
}

/** 打开搜索结果：联系人先建（或取）单聊；按消息内容搜到的定位到那条 */
function useOpenResult() {
  const messenger = useMessenger();
  const errorText = useErrorText();
  return useCallback(
    (item: SearchItem) => {
      if (typeof item.id === 'number') {
        openDialogRoute(item.id, item.search_msg_id ?? undefined);
        return;
      }
      const userid = item.dialog_user?.userid;
      if (!messenger || !userid) return;
      messenger
        .openUser(userid)
        .then((id) => openDialogRoute(id))
        .catch((err) => showToast(errorText(err)));
    },
    [messenger, errorText],
  );
}


function Hint({ text }: { text: string }) {
  return (
    <View style={styles.hint}>
      <Text style={styles.hintText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  search: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  chipsBar: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chips: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.page,
    paddingVertical: theme.spacing.sm,
  },
  chip: (selected: boolean, pressed: boolean, hovered: boolean) => ({
    height: theme.size.chip,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    backgroundColor: selected ? theme.colors.primarySoft : pressed ? theme.colors.fillPressed : hovered ? theme.colors.fillButton : theme.colors.fill,
  }),
  chipText: (selected: boolean) => ({
    ...theme.typography.subhead,
    color: selected ? theme.colors.primaryText : theme.colors.text2,
    fontWeight: selected ? '600' : '400',
  }),
  list: {
    flex: 1,
  },
  hint: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  hintText: {
    ...theme.typography.subhead,
    color: theme.colors.text3,
    textAlign: 'center',
  },
}));
