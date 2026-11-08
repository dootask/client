import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

import { lightTheme } from '../theme/tokens';
import { HighlightContext } from './highlight';
import { keyOf, sameDay } from './rows';
import { createScrollDistance } from './scrollDistance';
import { createStore, type Store } from './store';
import type { ChatMessage, MessageRenderInfo, ScrollToMessageOptions } from './types';
import { bottomOf, buildLayoutModel, rangeContains, readerAnchor, topOf, visibleRange, type RenderRange } from './virtualModel';

/**
 * Web 消息列表（只给 ChatView.web 用），做法参考 happy-next 的 ChatList.web.tsx：
 *
 * 1. column-reverse 滚动容器里只放一个正序的内容列。column-reverse 只取它的坐标语义：scrollTop 0 即底部，
 *    首屏在底部、停在底部跟随新消息都是结构上自然成立的。DOM 顺序与阅读顺序一致，选中文字、页内查找按正常顺序走
 * 2. 只挂可视区附近的行，其余用上下两块占位撑高。行高由 ResizeObserver 量出喂回布局模型，修正在绘制前完成
 * 3. 内容列 `overflow-anchor: none`，浏览器不自作主张挪位置。视口上方的变化（翻页、上方行改高）天然不动视口；
 *    下方的变化按「读者盯着的那条线」（视口里最下面一条的底边）前后位置差补一次滚动
 * 4. 所有滚动写入都经 scrollDistance 记账，补偿从「上次让它停在哪」算，不从 DOM 读回再算，避免小数量化带来的漂移
 */

/** 离底部多远以内算「在底部」：隐藏回到底部按钮 */
const AT_BOTTOM_THRESHOLD = 80;
/** 没量过的行按这个高度估 */
const ROW_ESTIMATE = 80;
/** 可视区上下各多挂几行 */
const OVERSCAN = 8;
/** 离已加载内容的边缘不到这么远时加载下一页 */
const EDGE_DISTANCE = 800;
/** 定位后这段时间里行高还在修正，目标行跟着重新摆 */
const LOCATE_SETTLE = 600;
/** 回到底部的动画：离底部不超过几屏才动画，再远直接跳 */
const BOTTOM_ANIMATE_MAX_VIEWPORTS = 3;
const BOTTOM_ANIMATE_MS = 260;
/** 一行露出多少算看到 */
const VISIBLE_RATIO = 0.2;
/** 首次量到视口之前的估计 */
const VIEWPORT_GUESS = 800;

const { spacing } = lightTheme;

export interface WebMessageListHandle {
  scrollToBottom: (animated?: boolean) => void;
  /** 内容整体下移 delta（离底部的距离加 delta） */
  scrollBy: (delta: number) => void;
  scrollToMessage: (id: string, options?: ScrollToMessageOptions) => Promise<void>;
}

interface WebMessageListProps<T> {
  messages: readonly ChatMessage<T>[];
  currentUserId: string;
  renderMessage: (info: MessageRenderInfo<T>) => ReactNode;
  renderDay?: (createdAt: number) => ReactNode;
  highlightColor: string;
  loadingIndicator?: ReactNode;
  hasEarlier?: boolean;
  loadingEarlier?: boolean;
  onLoadEarlier?: () => void;
  hasNewer?: boolean;
  loadingNewer?: boolean;
  onLoadNewer?: () => void;
  onAtBottomChange: (atBottom: boolean) => void;
  onVisibleChange?: (ids: string[]) => void;
}

interface Locate {
  id: string;
  above: number | undefined;
  /** 到这个时间之前，布局变化后都重新摆一次目标 */
  until: number;
}

function WebMessageListInner<T>(props: WebMessageListProps<T>, ref: React.Ref<WebMessageListHandle>) {
  const { messages, currentUserId, renderMessage, renderDay, highlightColor, loadingIndicator, hasEarlier, loadingEarlier, hasNewer, loadingNewer } = props;
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  });

  const [dist] = useState(createScrollDistance);
  const [highlight] = useState(() => createStore<string | null>(null));

  // 按时间正序（模型和 DOM 都是最早的在前）
  const chron = useMemo(() => [...messages].reverse(), [messages]);
  const keys = useMemo(() => chron.map(keyOf), [chron]);

  // 行高：一个 ResizeObserver 量所有挂着的行。量到就同步提交，补偿在同一帧绘制前完成
  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(() => new Map());
  const [rowObserver] = useState(() => new ResizeObserver((entries) => {
    flushSync(() => setHeights((prev) => {
      let next: Map<string, number> | null = null;
      for (const entry of entries) {
        const key = (entry.target as HTMLElement).dataset.key;
        const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
        if (!key || prev.get(key) === height) continue;
        next ??= new Map(prev);
        next.set(key, height);
      }
      return next ?? prev;
    }));
  }));
  useEffect(() => () => rowObserver.disconnect(), [rowObserver]);

  const layout = useMemo(() => buildLayoutModel(keys, heights, ROW_ESTIMATE), [keys, heights]);
  const [viewport, setViewport] = useState(VIEWPORT_GUESS);
  const [range, setRange] = useState<RenderRange & { keys: string[] }>(() => ({ ...visibleRange(layout, 0, VIEWPORT_GUESS, OVERSCAN), keys }));
  // 数据变了，旧下标指的不是原来的行：按首尾行的键换算，找不到就按当前位置重算
  const shown = useMemo<RenderRange>(() => {
    if (range.keys === keys) return range;
    const start = layout.indexByKey.get(range.keys[range.start] ?? '');
    const last = layout.indexByKey.get(range.keys[range.end - 1] ?? '');
    if (start !== undefined && last !== undefined && start <= last) return { start, end: last + 1 };
    return visibleRange(layout, dist.get(), viewport, OVERSCAN);
  }, [range, keys, layout, dist, viewport]);

  // 回调里要读的最新渲染结果；最先登记，同一次提交里后面的副作用读到的都是新的
  const live = useRef({ chron, layout, heights, shown, viewport });
  useLayoutEffect(() => {
    live.current = { chron, layout, heights, shown, viewport };
  });

  const updateRange = useCallback((distance: number) => {
    const { layout: model, shown: current, viewport: height } = live.current;
    const needed = visibleRange(model, distance, height, OVERSCAN);
    // 挂着的行还盖得住就不动，小幅滚动不引起重渲染
    const next = rangeContains(current, needed) && current.end <= model.keys.length ? current : needed;
    setRange((prev) => (prev.keys === model.keys && prev.start === next.start && prev.end === next.end ? prev : { ...next, keys: model.keys }));
  }, []);

  // 读者盯着的那一行，内容变化后按它的底边补偿
  const anchor = useRef<string | null>(null);
  const prevLayout = useRef(layout);
  const atBottom = useRef(true);
  const lastHasNewer = useRef(!!hasNewer);
  const locate = useRef<Locate | null>(null);
  const locateDone = useRef<(() => void) | null>(null);
  const bottomAnimation = useRef(0);
  const visibleKey = useRef('');

  const finishLocate = useCallback(() => {
    locateDone.current?.();
    locateDone.current = null;
  }, []);

  const cancelAnimations = useCallback(() => {
    cancelAnimationFrame(bottomAnimation.current);
    bottomAnimation.current = 0;
    locate.current = null;
  }, []);

  /** 目标行要摆到的位置：居中，或往更早数 above 条贴顶 */
  const locateDistance = useCallback((target: Locate): number | null => {
    const { layout: model, viewport: height } = live.current;
    const index = model.indexByKey.get(target.id);
    if (index === undefined) return null;
    const max = Math.max(0, model.total - height);
    if (target.above === undefined) {
      const center = model.bottomOffsets[index]! + model.heights[index]! / 2 - height / 2;
      return Math.min(max, Math.max(0, center));
    }
    const topKey = model.keys[Math.max(0, index - target.above)]!;
    return Math.min(max, Math.max(0, topOf(model, topKey)! - height));
  }, []);

  /** 位置变了以后：记下读者那行、在不在底部、该挂哪些行、要不要翻页、哪些行看到了 */
  const afterMove = useCallback((distance: number) => {
    const { layout: model, viewport: height, heights: known } = live.current;
    anchor.current = readerAnchor(model, distance, height, known);
    const bottom = distance < AT_BOTTOM_THRESHOLD;
    if (bottom !== atBottom.current) {
      atBottom.current = bottom;
      latest.current.onAtBottomChange(bottom);
    }
    updateRange(distance);

    const p = latest.current;
    if (!locate.current) {
      if (p.hasEarlier && !p.loadingEarlier && model.total - distance - height < EDGE_DISTANCE) p.onLoadEarlier?.();
      if (p.hasNewer && !p.loadingNewer && distance < EDGE_DISTANCE) p.onLoadNewer?.();
    }

    if (p.onVisibleChange) {
      const strict = visibleRange(model, distance, height, 0);
      const ids: string[] = [];
      const top = distance + height;
      for (let i = strict.start; i < strict.end; i++) {
        const lo = model.bottomOffsets[i]!;
        const hi = lo + model.heights[i]!;
        const seen = Math.min(hi, top) - Math.max(lo, distance);
        if (seen >= Math.min(model.heights[i]!, height) * VISIBLE_RATIO) ids.push(live.current.chron[i]!.id);
      }
      const key = ids.join(',');
      if (key !== visibleKey.current) {
        visibleKey.current = key;
        p.onVisibleChange(ids);
      }
    }
  }, [updateRange]);

  // 每次布局变化（数据变、量到新高度）后在绘制前摆好位置
  useLayoutEffect(() => {
    const prev = prevLayout.current;
    prevLayout.current = layout;
    let distance = dist.get();
    const target = locate.current;
    if (target && Date.now() < target.until) {
      distance = locateDistance(target) ?? distance;
    } else if (distance < 1 && !lastHasNewer.current && !hasNewer) {
      // 停在最底部：新消息直接出现在底部
      distance = 0;
    } else if (anchor.current && prev !== layout) {
      const before = bottomOf(prev, anchor.current);
      const after = bottomOf(layout, anchor.current);
      if (before !== null && after !== null) distance += after - before;
    }
    lastHasNewer.current = !!hasNewer;
    if (Math.abs(distance - dist.get()) > 0.5) dist.set(distance);
    afterMove(dist.get());
  }, [layout, hasNewer, dist, locateDistance, afterMove]);

  // 等待中的定位：数据里出现目标时摆过去
  const tryLocate = useCallback(() => {
    const target = locate.current;
    if (!target) return;
    const distance = locateDistance(target);
    if (distance === null) return;
    target.until = Date.now() + LOCATE_SETTLE;
    dist.set(distance);
    afterMove(distance);
    setTimeout(() => {
      if (locate.current !== target) return;
      locate.current = null;
      finishLocate();
      // 定位期间压下的翻页按停下的位置补查
      afterMove(dist.get());
    }, LOCATE_SETTLE);
  }, [locateDistance, dist, afterMove, finishLocate]);
  useEffect(tryLocate, [layout.keys, tryLocate]);

  // 视口尺寸：变了在绘制前重新摆
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const attachScroller = useCallback((el: HTMLDivElement | null) => {
    dist.attach(el);
    setScroller(el);
  }, [dist]);
  useLayoutEffect(() => {
    if (!scroller) return;
    // 开始观察时就会回调一次；回调在 React 之外，同步提交才赶得上这一帧
    const observer = new ResizeObserver(() => {
      if (scroller.clientHeight > 0) flushSync(() => setViewport(scroller.clientHeight));
    });
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scroller]);
  useLayoutEffect(() => {
    afterMove(dist.get());
  }, [viewport, afterMove, dist]);

  const onScroll = useCallback(() => {
    const { distance, moved } = dist.noteScroll();
    if (moved && locate.current && !bottomAnimation.current) {
      // 有人动了它（滚轮、拖滚动条、页内查找），定位让位
      locate.current = null;
      finishLocate();
    }
    afterMove(distance);
  }, [dist, afterMove, finishLocate]);

  // 读者的输入：打断定位和回到底部的动画
  const onUserInput = useCallback(() => {
    if (!locate.current && !bottomAnimation.current) return;
    cancelAnimations();
    finishLocate();
  }, [cancelAnimations, finishLocate]);

  const animateToBottom = useCallback(() => {
    const from = dist.get();
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / BOTTOM_ANIMATE_MS);
      const eased = 1 - (1 - t) ** 3;
      dist.set(from * (1 - eased));
      afterMove(dist.get());
      bottomAnimation.current = t < 1 ? requestAnimationFrame(step) : 0;
    };
    bottomAnimation.current = requestAnimationFrame(step);
  }, [dist, afterMove]);

  useImperativeHandle(ref, () => ({
    scrollToBottom: (animated = true) => {
      cancelAnimations();
      finishLocate();
      if (animated && dist.get() <= live.current.viewport * BOTTOM_ANIMATE_MAX_VIEWPORTS) {
        animateToBottom();
        return;
      }
      dist.set(0);
      afterMove(0);
    },
    scrollBy: (delta) => {
      const next = Math.max(0, dist.get() + delta);
      dist.set(next);
      afterMove(next);
    },
    scrollToMessage: (id, options = {}) => {
      cancelAnimations();
      finishLocate();
      const done = new Promise<void>((resolve) => {
        locateDone.current = resolve;
      });
      locate.current = { id, above: options.above, until: Number.POSITIVE_INFINITY };
      tryLocate();
      if (options.highlight !== false) {
        highlight.set(null);
        setTimeout(() => highlight.set(id), 250);
      }
      return done;
    },
  }), [cancelAnimations, finishLocate, animateToBottom, afterMove, dist, tryLocate, highlight]);

  useEffect(() => () => cancelAnimationFrame(bottomAnimation.current), []);

  const rows: ReactNode[] = [];
  for (let i = shown.start; i < Math.min(shown.end, chron.length); i++) {
    const message = chron[i]!;
    const older = chron[i - 1];
    rows.push(
      <RowFrame key={keyOf(message)} rowKey={keyOf(message)} id={message.id} observer={rowObserver} store={highlight} color={highlightColor}>
        {renderDay && (!older || !sameDay(older.createdAt, message.createdAt)) && renderDay(message.createdAt)}
        {renderMessage({ message, older, newer: chron[i + 1], isOwn: message.authorId === currentUserId })}
      </RowFrame>,
    );
  }
  const topSpace = layout.topOffsets[shown.start] ?? 0;
  const lastShown = Math.min(shown.end, chron.length) - 1;
  const bottomSpace = lastShown >= 0 ? layout.bottomOffsets[lastShown]! : 0;

  return (
    <div style={WRAP}>
      <div
        ref={attachScroller}
        style={SCROLLER}
        onScroll={onScroll}
        onWheel={onUserInput}
        onPointerDown={onUserInput}
        onTouchStart={onUserInput}
        onKeyDown={onUserInput}
      >
        <div style={CONTENT}>
          {/* 加载更早的提示在内容最上方：出现、消失都在视口上方，不挪动阅读位置 */}
          {hasEarlier && loadingEarlier && messages.length > 0 ? loadingIndicator : null}
          <div style={{ height: topSpace }} />
          {rows}
          <div style={{ height: bottomSpace }} />
        </div>
      </div>
      {/* 加载更新的提示浮在底部，不占内容高度 */}
      {hasNewer && loadingNewer ? <div style={BOTTOM_EDGE}>{loadingIndicator}</div> : null}
    </div>
  );
}

// 输入栏每打一个字 ChatView 都会重渲染，列表参数没变就不跟着重渲染
export const WebMessageList = memo(forwardRef(WebMessageListInner)) as <T>(
  props: WebMessageListProps<T> & { ref?: React.Ref<WebMessageListHandle> },
) => React.ReactElement;

function RowFrame({ rowKey, id, observer, store, color, children }: {
  rowKey: string;
  id: string;
  observer: ResizeObserver;
  store: Store<string | null>;
  color: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    observer.observe(el);
    return () => observer.unobserve(el);
  }, [observer]);
  const highlight = useMemo(() => ({ store, id, color }), [store, id, color]);
  return (
    <div ref={ref} data-key={rowKey} style={ROW}>
      <HighlightContext.Provider value={highlight}>{children}</HighlightContext.Provider>
    </div>
  );
}

const WRAP: React.CSSProperties = { position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' };
const SCROLLER: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column-reverse',
  overflowY: 'auto',
  overflowX: 'hidden',
  overflowAnchor: 'none',
  outline: 'none',
};
// 最新一条与输入栏之间多留一点
const CONTENT: React.CSSProperties = { display: 'flex', flexDirection: 'column', flexShrink: 0, paddingTop: spacing.sm, paddingBottom: spacing.lg, overflowAnchor: 'none' };
const ROW: React.CSSProperties = { display: 'flex', flexDirection: 'column', position: 'relative', flexShrink: 0 };
const BOTTOM_EDGE: React.CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'none' };
