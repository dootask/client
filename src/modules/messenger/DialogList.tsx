import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { router, usePathname } from 'expo-router';
import { type ReactElement, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { dialogApi } from '../../sync/api';
import type { SearchItem } from '../../sync/api/dialog';
import { useSplitView } from '../../ui/layout';
import { CompactBar, LargeTitle, ScrollOffsetProvider, TrackedScrollView } from '../../ui/LargeHeader';
import { showToast } from '../../ui/Toast';
import { api, useErrorText } from '../session';
import { useNow } from './clock';
import { DialogRow, ResultRow } from './DialogRow';
import { DialogBar, DialogNav, DialogSearch } from './DialogListChrome';
import { useMessenger, useMessengerState } from './hooks';
import { type ListCategory, listedIds, shakeTargetId } from './listModel';
import { setShakeHandler, useDialogListState } from './listState';
import { AI_HIDDEN, searchRowKey, type SearchRow, useSearchRows } from './search';

/** 列表的一行：本地会话、服务端的搜索结果或标注消息、没有内容时的提示 */
type Row = SearchRow | { kind: 'hint'; text: string };

const rowKey = (r: Row) => (r.kind === 'hint' ? 'hint' : searchRowKey(r));

// 新消息把会话顶到最上面时：停在顶部附近就跟着显示新的第一行，翻到下面时保持当前位置不跳
const TOP_ANCHOR = { autoscrollToTopThreshold: 48 };

// 分类条吸顶时盖在行上面。FlashList 自己包的那层不经过 unistyles，给普通样式对象
const HEADER_ABOVE_ROWS = { zIndex: 1 };

/** 晃动动画放完后清掉（动画 200 延迟 + 600 时长） */
const SHAKE_CLEAR_MS = 900;

/** 当前打开的会话 id（路由 /messenger/<id>），没有为 0 */
function useOpenRouteId(): number {
  const pathname = usePathname();
  const match = /^\/messenger\/(\d+)/.exec(pathname);
  return match ? Number(match[1]) : 0;
}

export function openDialogRoute(id: number, msgId?: number) {
  router.navigate({ pathname: '/messenger/[dialogId]', params: msgId ? { dialogId: String(id), msg: String(msgId) } : { dialogId: String(id) } });
}

/**
 * 会话列表（同旧版 messenger-select）。
 * 宽屏是消息页左边的列表栏：搜索、分类条、列表、底部「消息 / 联系人」；
 * 窄屏是「消息」Tab 首页：大标题和搜索随列表滚走，分类条吸顶在小标题条下面
 */
export function DialogList() {
  return useSplitView() ? <WideDialogList /> : <NarrowDialogList />;
}

function WideDialogList() {
  const listRef = useRef<FlashListRef<Row>>(null);
  const { rows, loading, searching } = useRows();
  return (
    <View testID="dialog-list" style={styles.wide}>
      <DialogSearch narrow={false} loading={loading} />
      {!searching && <DialogNav narrow={false} />}
      <RowList listRef={listRef} rows={rows} searching={searching} narrow={false} />
      <DialogBar />
    </View>
  );
}

function NarrowDialogList() {
  const t = useT();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlashListRef<Row>>(null);
  const offset = useSharedValue(0);
  const { rows, loading, searching } = useRows();
  const { largeTitleRow, dialogSearchRow, compactBar, dialogChrome } = theme.size;
  // 小标题条在搜索框被它盖住时出现；分类条滚到小标题条下沿（压住 1 像素防缝）后吸顶
  const compactLine = largeTitleRow + dialogSearchRow - dialogChrome.searchPadBottom - compactBar;
  const stickAt = largeTitleRow + dialogSearchRow - compactBar + 1;
  const navStyle = useAnimatedStyle(() => ({ transform: [{ translateY: Math.max(0, offset.get() - stickAt) }] }));

  const header = (
    <View>
      <View style={styles.narrowHead}>
        <LargeTitle title={t('shell:tab.messenger')} />
      </View>
      <DialogSearch narrow loading={loading} />
      {!searching && (
        <Animated.View style={navStyle}>
          <DialogNav narrow />
        </Animated.View>
      )}
    </View>
  );

  return (
    <View style={[styles.narrow, { paddingTop: insets.top }]}>
      <ScrollOffsetProvider value={offset}>
        <RowList listRef={listRef} rows={rows} searching={searching} narrow header={header} />
      </ScrollOffsetProvider>
      <View style={[styles.compactWrap, { top: insets.top }]} pointerEvents="box-none">
        <CompactBar
          title={t('shell:tab.messenger')}
          offset={offset}
          line={compactLine}
          showLine={searching}
          onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
        />
      </View>
    </View>
  );
}

/** 当前分类、搜索词下的行；loading：搜索框里转圈 */
function useRows(): { rows: Row[]; loading: boolean; searching: boolean } {
  const t = useT();
  const category = useDialogListState((s) => s.category);
  const key = useDialogListState((s) => s.key);
  const ready = useMessengerState((s) => s.ready);
  const keyword = key.trim();
  const ids = useListedIds(keyword ? '' : category, keyword);
  const search = useSearchRows(keyword ? ids : NO_IDS, keyword);
  const marks = useMarks(!keyword && category === 'mark');
  return useMemo(() => {
    const hint = (text: string): Row[] => [{ kind: 'hint', text }];
    if (keyword) {
      const rows = search.rows.length || search.searching ? search.rows : hint(t('messenger:noResult', { key: keyword }));
      return { rows, loading: search.searching, searching: true };
    }
    if (category === 'mark') {
      if (!marks) return { rows: [], loading: true, searching: false };
      return { rows: marks.length ? marks.map((item) => ({ kind: 'result', item })) : hint(t('messenger:empty')), loading: false, searching: false };
    }
    if (!ready) return { rows: [], loading: true, searching: false };
    return { rows: ids.length ? ids.map((id) => ({ kind: 'dialog', id })) : hint(t('messenger:empty')), loading: false, searching: false };
  }, [t, keyword, category, ready, ids, search, marks]);
}

const NO_IDS: readonly number[] = [];

function useListedIds(category: ListCategory, key: string): number[] {
  const dialogs = useMessengerState((s) => s.dialogs);
  const drafts = useMessengerState((s) => s.drafts);
  const openId = useMessengerState((s) => s.openId);
  const now = useNow();
  return useMemo(() => listedIds({ dialogs, drafts, openId, aiHidden: AI_HIDDEN, now: now / 1000 }, category, key), [dialogs, drafts, openId, now, category, key]);
}

/** 标注：服务端最近被标注的消息，每条一行，点开定位到那条；切到标注时重新取 */
function useMarks(active: boolean): SearchItem[] | null {
  const errorText = useErrorText();
  const [items, setItems] = useState<SearchItem[] | null>(null);
  useEffect(() => {
    if (!active) return;
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
      // 离开标注时清掉，下次切回来先显示加载中、再取最新的
      setItems(null);
    };
  }, [active, errorText]);
  return items;
}

function RowList({
  listRef,
  rows,
  searching,
  narrow,
  header,
}: {
  listRef: RefObject<FlashListRef<Row> | null>;
  rows: Row[];
  searching: boolean;
  narrow: boolean;
  header?: ReactElement;
}) {
  const openId = useOpenRouteId();
  const openResult = useOpenResult();
  const shake = useShake(listRef, rows);
  const last = rows.length - 1;

  const renderItem = useCallback(
    ({ item, index }: { item: Row; index: number }) => {
      const line = narrow && index < last;
      if (item.kind === 'dialog') {
        return <DialogRow id={item.id} active={item.id === openId} shake={item.id === shake.id ? shake.nonce : 0} line={line} searching={searching} onOpen={openDialogRoute} />;
      }
      if (item.kind === 'result') return <ResultRow item={item.item} line={line} onOpen={openResult} />;
      return <Hint text={item.text} />;
    },
    [openId, shake, narrow, last, searching, openResult],
  );

  return (
    <FlashList
      ref={listRef}
      data={rows}
      renderItem={renderItem}
      keyExtractor={rowKey}
      getItemType={(r) => r.kind}
      extraData={renderItem}
      maintainVisibleContentPosition={TOP_ANCHOR}
      ListHeaderComponent={header}
      ListHeaderComponentStyle={HEADER_ABOVE_ROWS}
      renderScrollComponent={header ? TrackedScrollView : undefined}
      keyboardShouldPersistTaps="handled"
      style={styles.list}
    />
  );
}

/** 再点当前分类、再点「消息」：滚到第一个有未读的会话并晃动它（同旧版 shakeUnread） */
function useShake(listRef: RefObject<FlashListRef<Row> | null>, rows: Row[]): { id: number; nonce: number } {
  const [shake, setShake] = useState({ id: 0, nonce: 0 });
  const dialogs = useMessengerState((s) => s.dialogs);
  const latest = useRef({ rows, dialogs });
  useEffect(() => {
    latest.current = { rows, dialogs };
  }, [rows, dialogs]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    setShakeHandler(() => {
      const { rows: current, dialogs: all } = latest.current;
      const ids = current.flatMap((r) => (r.kind === 'dialog' ? [r.id] : []));
      const id = shakeTargetId(ids, all);
      if (!id) return;
      listRef.current?.scrollToIndex({ index: current.findIndex((r) => r.kind === 'dialog' && r.id === id), animated: true, viewPosition: 0.5 });
      setShake((s) => ({ id, nonce: s.nonce + 1 }));
      clearTimeout(timer);
      timer = setTimeout(() => setShake((s) => ({ id: 0, nonce: s.nonce })), SHAKE_CLEAR_MS);
    });
    return () => {
      setShakeHandler(null);
      clearTimeout(timer);
    };
  }, [listRef]);
  return shake;
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
    <View testID="dialog-hint" style={styles.hint}>
      <Text style={styles.hintText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wide: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  narrow: {
    flex: 1,
    backgroundColor: theme.colors.headerBg,
  },
  narrowHead: {
    backgroundColor: theme.colors.headerBg,
  },
  compactWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: theme.size.compactBar,
    zIndex: 2,
  },
  list: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  hint: {
    padding: theme.spacing.xxl,
  },
  hintText: {
    ...theme.typography.listHint,
    color: theme.colors.regularText,
    textAlign: 'center',
  },
}));
