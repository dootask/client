import { MessagesContainer, defaultLightTheme, ChatContext, type IChatContext, type IMessage, type MessageProps } from '@kesha-antonov/react-native-chat';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import type { FlatList } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, type SharedValue, withTiming } from 'react-native-reanimated';

import { lightTheme } from '../theme/tokens';
import { HighlightContext } from './highlight';
import { keyOf, sameDay } from './rows';
import { createStore, useStore, type Store } from './store';
import type { ChatMessage, MessageRenderInfo, ScrollToMessageOptions } from './types';

/**
 * 消息列表：倒置列表（偏移 0 即底部），渲染引擎目前用 kesha 的 MessagesContainer。
 * 对外只暴露本库自己的类型，换引擎不影响使用方。
 *
 * 引擎把传入的所有 props 交给每一行并按引用比较，所以传给它的东西必须引用稳定：
 * 回调经 latest ref 读最新值，顶部留白、加载态、高亮经 store 只通知订阅它的组件。
 */

interface Row<T> extends IMessage {
  chat: ChatMessage<T>;
  /** 挂载时从底部顶上来 */
  enter?: boolean;
}

// 离底部多远以内算「在底部」：新消息自动跟随、隐藏回到底部按钮
const AT_BOTTOM_THRESHOLD = 80;
/** 定位滚动多久算停下 */
const LOCATE_SETTLE = 800;
/** 离边缘不到几屏时加载下一页（与 onStartReachedThreshold / onEndReachedThreshold 一致） */
const EDGE_THRESHOLD = 0.5;
/** 露出多少算看到：比例不能高，比屏幕还高的消息露不出太多 */
const VIEWABILITY = { itemVisiblePercentThreshold: 20 };
/** 目标行还没测量过时，隔多久重试、最多几次（开发包渲染慢，一屏十几行要好几百毫秒） */
const LOCATE_RETRY_DELAY = 150;
const LOCATE_RETRIES = 12;
/** 一次最多几条新消息一起顶上来，再多就是一页新数据，直接出现 */
const ENTER_MAX = 3;
const ENTER_TIMING = { duration: 280, easing: Easing.out(Easing.cubic) };
const NONE: ReadonlySet<string> = new Set();


/** 底部新到的几条（按行键）：只在原来最新那条前面多出几条时算 */
function newAtBottom<T>(prev: readonly ChatMessage<T>[], next: readonly ChatMessage<T>[]): ReadonlySet<string> {
  if (prev.length === 0) return NONE;
  const newest = keyOf(prev[0]);
  const count = next.findIndex((message) => keyOf(message) === newest);
  return count > 0 && count <= ENTER_MAX ? new Set(next.slice(0, count).map(keyOf)) : NONE;
}

// kesha 内部组件从 ChatContext 取主题，只需要把列表底色置为透明，背景由使用方决定
const theme = { ...defaultLightTheme, colors: { ...defaultLightTheme.colors, background: 'transparent' } };
const chatContext: IChatContext = {
  getLocale: () => 'zh',
  getIsRTL: () => false,
  actionSheet: () => ({ showActionSheetWithOptions: () => {} }),
  getColorScheme: () => null,
  getTheme: () => theme,
};

// 日期分隔由 renderRow 自己画
const renderNothing = () => null;

const rowCache = new WeakMap<ChatMessage<unknown>, Row<unknown>>();

function toRow<T>(message: ChatMessage<T>, enter: boolean): Row<T> {
  // 只有新到的那一次带 enter，之后换回缓存的行（行框只看挂载时，不会重挂）
  if (enter) return { _id: keyOf(message), text: '', createdAt: message.createdAt, user: { _id: message.authorId }, chat: message, enter };
  let row = rowCache.get(message) as Row<T> | undefined;
  if (!row) {
    row = { _id: keyOf(message), text: '', createdAt: message.createdAt, user: { _id: message.authorId }, chat: message };
    rowCache.set(message, row);
  }
  return row;
}

interface Edges {
  topInset: number;
  loadingEarlier: boolean;
  loadingNewer: boolean;
}

export interface MessageListHandle {
  scrollToBottom: (animated?: boolean) => void;
  /** 内容整体下移 delta（倒置列表即偏移加 delta），不动画 */
  scrollBy: (delta: number) => void;
  /** 定位完成（含重试后的校正）或被取消时 resolve */
  scrollToMessage: (id: string, options?: ScrollToMessageOptions) => Promise<void>;
}

interface MessageListProps<T> {
  messages: readonly ChatMessage<T>[];
  currentUserId: string;
  renderMessage: (info: MessageRenderInfo<T>) => ReactNode;
  renderDay?: (createdAt: number) => ReactNode;
  highlightColor: string;
  loadingIndicator?: ReactNode;
  /** 列表最顶端额外留白：内容整体被底部区域顶起时，保证最早的消息仍能滚到可见处 */
  topInset: number;
  hasEarlier?: boolean;
  loadingEarlier?: boolean;
  onLoadEarlier?: () => void;
  hasNewer?: boolean;
  loadingNewer?: boolean;
  onLoadNewer?: () => void;
  onAtBottomChange: (atBottom: boolean) => void;
  onVisibleChange?: (ids: string[]) => void;
  /** 为真时在 UI 线程锁住滚动（拖动键盘期间，见 useBottomInset） */
  scrollLocked: SharedValue<boolean>;
}

function MessageListInner<T>(props: MessageListProps<T>, ref: React.Ref<MessageListHandle>) {
  const { messages, currentUserId, renderMessage, renderDay, highlightColor, loadingIndicator, hasNewer } = props;
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  });

  const listRef = useRef<FlatList<Row<T>>>(null);
  const highlight = useMemo(() => createStore<string | null>(null), []);
  const edges = useMemo(() => createStore<Edges>({ topInset: 0, loadingEarlier: false, loadingNewer: false }), []);
  const { topInset, hasEarlier, loadingEarlier, loadingNewer } = props;
  // 加载提示只在那一端确实还有数据时显示：回到最新后旧的加载请求可能还没结束，
  // 提示若留在最新一页底部，结束时整页会跟着下沉一个提示的高度。没有消息时由 ChatView 居中显示
  const empty = messages.length === 0;
  useLayoutEffect(() => {
    edges.set({ topInset, loadingEarlier: !!(hasEarlier && loadingEarlier) && !empty, loadingNewer: !!(hasNewer && loadingNewer) });
  }, [edges, topInset, hasEarlier, loadingEarlier, hasNewer, loadingNewer, empty]);

  const atBottom = useRef(true);
  // 在底部时关掉 maintainVisibleContentPosition：新消息插在偏移 0 处自然出现在底部。
  // 不用系统的 autoscrollToTopThreshold：Android 上它先平移保持位置再平滑滚回 0，平滑滚动会被紧接着的挂载打断而停在半路
  const [following, setFollowing] = useState(true);
  // 显示过不含最新消息的数据后一直保持位置，直到回到底部：hasNewer 变为 false 的那次提交
  // 正是新一页插在下标 0（如跳转后补齐了中间的缺口），此时仍要保持，否则目标被顶出可视区
  const [holdPosition, setHoldPosition] = useState(!!hasNewer);
  if (hasNewer && !holdPosition) setHoldPosition(true);

  // 停在底部时新到的消息从底部顶上来；首屏、翻页、跳转、离开底部时都直接出现
  const [shown, setShown] = useState({ messages, entering: NONE });
  if (shown.messages !== messages) {
    setShown({ messages, entering: following && !holdPosition && !hasNewer ? newAtBottom(shown.messages, messages) : NONE });
  }
  const { entering } = shown;
  const rows = useMemo(() => messages.map((message) => toRow(message, entering.has(keyOf(message)))), [messages, entering]);
  const rowsRef = useRef(rows);
  useLayoutEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // 离开底部时调用过 scrollToBottom（如发送）：内容变化后再直接跳到底，因为滚动途中的挂载会打断平滑滚动
  const followNext = useRef(false);

  const user = useMemo(() => ({ _id: currentUserId }), [currentUserId]);

  // 等待定位的消息：不在当前数据里时，数据更新后再试
  const pendingTarget = useRef<{ id: string; options: ScrollToMessageOptions } | null>(null);
  // 这次定位结束时通知调用方
  const locateDone = useRef<(() => void) | null>(null);
  const finishLocate = useCallback(() => {
    locateDone.current?.();
    locateDone.current = null;
  }, []);
  // 正在进行的定位：目标行没渲染过时重试要用同样的方式
  const attempt = useRef({ viewPosition: 0.5, animated: true });
  const retries = useRef(0);
  // 定位途中不触发分页：换窗口后列表先停在偏移 0，滚到目标前就会碰到边缘，
  // 补回的一页会把目标顶走。从发起定位到滚动停下（或用户拖动）为止
  const locatingUntil = useRef(0);
  const locating = () => pendingTarget.current !== null || Date.now() < locatingUntil.current;
  // 被压下的边缘回调列表不会再补发：停下后按最后一次滚动的位置自己补查
  const metrics = useRef({ offset: 0, content: 0, viewport: 0 });
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const correctTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => {
    clearTimeout(settleTimer.current);
    clearTimeout(correctTimer.current);
  }, []);
  const checkEdges = useCallback(() => {
    if (locating()) return;
    const p = latest.current;
    const { offset, content, viewport } = metrics.current;
    if (p.hasNewer && !p.loadingNewer && offset < viewport * EDGE_THRESHOLD) p.onLoadNewer?.();
    if (p.hasEarlier && !p.loadingEarlier && content - viewport - offset < viewport * EDGE_THRESHOLD) p.onLoadEarlier?.();
  }, []);

  // 各行的高度，定位时按露出的部分摆放要用
  const rowHeights = useMemo(() => new Map<string, number>(), []);
  // 键盘、面板弹起时列表整体上移、尺寸不变，视觉顶端 topInset 这一截藏在导航栏后面，
  // 按露出的部分摆放（居中即露出部分的中间，贴顶即贴露出部分的顶）。
  // 不用 viewOffset：列表先把偏移截到不小于 0 再减它，靠底的消息会被推出可视区
  const placement = useCallback((index: number, viewPosition: number) => {
    const hidden = latest.current.topInset;
    const { viewport } = metrics.current;
    const height = rowHeights.get(rowsRef.current[index]?.chat.id as string) ?? 0;
    if (!hidden || height >= viewport) return viewPosition;
    return Math.max(0, (viewPosition * (viewport - hidden - height)) / (viewport - height));
  }, [rowHeights]);

  const scrollToIndex = useCallback((index: number) => {
    locatingUntil.current = Date.now() + LOCATE_SETTLE;
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(checkEdges, LOCATE_SETTLE + 50);
    const failures = retries.current;
    listRef.current?.scrollToIndex({ index, ...attempt.current, viewPosition: placement(index, attempt.current.viewPosition) });
    // 失败回调是同步的：次数没增加即这次滚成了。重试过的话用到的高度含估算值，等中间的行渲染完再校正一次
    if (retries.current !== failures) return;
    if (failures === 0) {
      requestAnimationFrame(finishLocate);
      return;
    }
    retries.current = 0;
    clearTimeout(correctTimer.current);
    correctTimer.current = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, ...attempt.current, viewPosition: placement(index, attempt.current.viewPosition), animated: false });
      requestAnimationFrame(finishLocate);
    }, LOCATE_RETRY_DELAY * 2);
  }, [checkEdges, finishLocate, placement]);

  const tryPendingTarget = useCallback(() => {
    if (!pendingTarget.current) return;
    const { id, options: { animated = true, highlight: flash = true, above } } = pendingTarget.current;
    const index = rowsRef.current.findIndex((r) => r.chat.id === id);
    if (index < 0) return;
    pendingTarget.current = null;
    retries.current = 0;
    // 倒置列表 viewPosition 1 是视觉顶端；往更早的方向数 above 条，那条贴顶
    attempt.current = { viewPosition: above === undefined ? 0.5 : 1, animated };
    scrollToIndex(above === undefined ? index : Math.min(index + above, rowsRef.current.length - 1));
    if (!flash) return;
    highlight.set(null);
    setTimeout(() => highlight.set(id), 250);
  }, [scrollToIndex, highlight]);

  useEffect(tryPendingTarget, [rows, tryPendingTarget]);

  useImperativeHandle(ref, () => ({
    scrollToBottom: (animated = true) => {
      if (!atBottom.current) {
        followNext.current = true;
        // 先关掉保持位置，否则随后插入的消息会被它平移到可视区外
        setFollowing(true);
      }
      listRef.current?.scrollToOffset({ offset: 0, animated });
    },
    scrollBy: (delta) => {
      listRef.current?.scrollToOffset({ offset: Math.max(0, metrics.current.offset + delta), animated: false });
    },
    scrollToMessage: (id, options = {}) => {
      finishLocate();
      const done = new Promise<void>((resolve) => {
        locateDone.current = resolve;
      });
      pendingTarget.current = { id, options };
      tryPendingTarget();
      return done;
    },
  }), [tryPendingTarget, finishLocate]);

  const { scrollLocked } = props;
  const animatedProps = useAnimatedProps(() => ({ scrollEnabled: !scrollLocked.value }));

  // 列表不允许中途换这个回调，保持引用不变
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: { item: Row<T> }[] }) => {
    latest.current.onVisibleChange?.(viewableItems.map((entry) => entry.item.chat.id));
  }, []);

  const listProps = useMemo(() => ({
      animatedProps,
      onScroll: (e: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } }) => {
        metrics.current = { offset: e.contentOffset.y, content: e.contentSize.height, viewport: e.layoutMeasurement.height };
        const next = e.contentOffset.y < AT_BOTTOM_THRESHOLD;
        if (next && !latest.current.hasNewer) setHoldPosition(false);
        if (next === atBottom.current) return;
        atBottom.current = next;
        if (next) followNext.current = false;
        setFollowing(next);
        latest.current.onAtBottomChange(next);
      },
      onScrollBeginDrag: () => {
        clearTimeout(correctTimer.current);
        pendingTarget.current = null;
        locatingUntil.current = 0;
        finishLocate();
      },
      onEndReached: () => {
        const p = latest.current;
        if (locating()) return;
        if (p.hasEarlier && !p.loadingEarlier) p.onLoadEarlier?.();
      },
      onEndReachedThreshold: EDGE_THRESHOLD,
      onStartReached: () => {
        const p = latest.current;
        if (locating()) return;
        if (p.hasNewer && !p.loadingNewer) p.onLoadNewer?.();
      },
      onStartReachedThreshold: EDGE_THRESHOLD,
      viewabilityConfig: VIEWABILITY,
      onViewableItemsChanged,
      // 目标行还没渲染过、高度未知：先按平均高度滚到附近，等它渲染后再精确定位
      onScrollToIndexFailed: (info: { index: number; averageItemLength: number }) => {
        if (retries.current >= LOCATE_RETRIES) {
          retries.current = 0;
          finishLocate();
          return;
        }
        retries.current += 1;
        listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
        setTimeout(() => scrollToIndex(info.index), LOCATE_RETRY_DELAY);
      },
      // 离开底部时新消息插入在下标 0 也保持阅读位置；在底部或数据不含最新消息时见上方 following
      maintainVisibleContentPosition: following && !holdPosition ? undefined : { minIndexForVisible: 0 },
      onContentSizeChange: () => {
        if (!followNext.current) return;
        followNext.current = false;
        // 不用动画：平滑滚动同样会被随后的挂载打断
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      },
      contentContainerStyle: styles.content,
      // 倒置列表：Footer 在视觉顶端，Header 在视觉底端
      ListFooterComponent: <TopEdge store={edges} indicator={loadingIndicator} />,
      ListHeaderComponent: <BottomEdge store={edges} indicator={loadingIndicator} />,
  }), [animatedProps, following, holdPosition, edges, loadingIndicator, scrollToIndex, onViewableItemsChanged, finishLocate]);

  const renderRow = useCallback((p: MessageProps<Row<T>>) => {
    const { currentMessage, previousMessage, nextMessage } = p;
    // 没有上一条时引擎给的是空对象
    const older = previousMessage?.chat as ChatMessage<T> | undefined;
    return (
      <RowFrame store={highlight} heights={rowHeights} id={currentMessage.chat.id} color={highlightColor} enter={!!currentMessage.enter}>
        {/* 日期分隔画在行框里，跟着新消息一起顶上来 */}
        {renderDay && (!older || !sameDay(older.createdAt, currentMessage.chat.createdAt)) && renderDay(currentMessage.chat.createdAt)}
        {renderMessage({
          message: currentMessage.chat,
          older,
          newer: nextMessage?.chat,
          isOwn: currentMessage.chat.authorId === currentUserId,
        })}
      </RowFrame>
    );
  }, [highlight, rowHeights, highlightColor, renderMessage, renderDay, currentUserId]);

  return (
    <ChatContext.Provider value={chatContext}>
      <MessagesContainer<Row<T>>
        forwardRef={listRef as React.RefObject<FlatList<Row<T>>>}
        messages={rows}
        user={user}
        isInverted
        isDayAnimationEnabled={false}
        isScrollToBottomEnabled={false}
        renderMessage={renderRow}
        renderDay={renderNothing}
        listProps={listProps}
      />
    </ChatContext.Provider>
  );
}

// 输入栏每打一个字 ChatView 都会重渲染，列表的参数没变就不跟着重渲染（否则 JS 处理一个按键要连带整屏消息，删除 @ 这类等 JS 回写的改动会明显迟钝）
export const MessageList = memo(forwardRef(MessageListInner)) as <T>(
  props: MessageListProps<T> & { ref?: React.Ref<MessageListHandle> },
) => React.ReactElement;

function TopEdge({ store, indicator }: { store: Store<Edges>; indicator: ReactNode }) {
  const topInset = useStore(store, (s) => s.topInset);
  const loading = useStore(store, (s) => s.loadingEarlier);
  return <View style={{ paddingTop: topInset }}>{loading ? indicator : null}</View>;
}

function BottomEdge({ store, indicator }: { store: Store<Edges>; indicator: ReactNode }) {
  const loading = useStore(store, (s) => s.loadingNewer);
  return loading ? <>{indicator}</> : null;
}

/**
 * 每一行的外框：给行内的 RowHighlight 提供闪烁信息；enter 的行（只看挂载时）从底部顶上来——
 * 外框高度从 0 长到实际高度，倒置列表底部不动，上面的消息被平滑推上去，像滚到底一样
 */
function RowFrame({ store, heights, id, color, enter, children }: {
  store: Store<string | null>;
  /** 挂着的行在这里登记自己的高度 */
  heights: Map<string, number>;
  id: string; color: string; enter: boolean; children: ReactNode;
}) {
  // 行不重挂而换了 id（发送中换成发出的消息）时，高度没变就不会再收到 onLayout，按上次量到的登记到新 id
  const measured = useRef(0);
  useEffect(() => {
    if (measured.current) heights.set(id, measured.current);
    return () => {
      heights.delete(id);
    };
  }, [heights, id]);
  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    measured.current = e.nativeEvent.layout.height;
    heights.set(id, measured.current);
  }, [heights, id]);
  const highlight = useMemo(() => ({ store, id, color }), [store, id, color]);

  // 行在结构上始终是同一棵树：只按挂载时决定要不要外框，之后 enter 变了也不换，免得整行重挂
  const [framed] = useState(enter);
  // 长高期间内容浮在外框里（不撑开它）；长完改回正常排版，外框改回自适应高度，之后内容变高变矮照常
  const [grown, setGrown] = useState(!enter);
  // -1：自适应高度
  const height = useSharedValue(0);
  // 长高途中内容又变高（如流式回复）就改朝新高度长
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    height.set(withTiming(e.nativeEvent.layout.height, ENTER_TIMING, (finished) => {
      if (finished) runOnJS(setGrown)(true);
    }));
  }, [height]);
  // 内容已回到正常排版再放开高度，否则放开的那一帧内容还浮着、外框会塌成 0
  useEffect(() => {
    if (framed && grown) height.set(-1);
  }, [framed, grown, height]);
  const frameStyle = useAnimatedStyle(() => ({ height: height.value < 0 ? 'auto' : height.value }));

  const content = (
    <HighlightContext.Provider value={highlight}>
      <View onLayout={onContentLayout}>{children}</View>
    </HighlightContext.Provider>
  );
  if (!framed) return content;
  return (
    <Animated.View style={frameStyle}>
      <View onLayout={grown ? undefined : onLayout} style={grown ? undefined : styles.floating}>{content}</View>
    </Animated.View>
  );
}

// 列表引擎是第三方组件，unistyles 管不到它的样式，直接取令牌（间距两套主题相同）
const { spacing } = lightTheme;

const styles = StyleSheet.create({
  // 倒置列表：paddingTop 在视觉底端，最新一条与输入栏之间多留一点
  content: { paddingTop: spacing.lg, paddingBottom: spacing.sm },
  floating: { position: 'absolute', top: 0, left: 0, right: 0 },
});
