/**
 * Web 消息列表的布局模型（纯计算），参考 happy-next 的 chatListVirtualModel.ts。
 * 坐标一律从底部量起：distance 是视口底边离内容底边多远（column-reverse 滚动容器里即 |scrollTop|）。
 * 条目按时间正序（下标 0 最早），topOffsets 递增、bottomOffsets 递减。
 * 从底部量起的好处：视口上方的估算误差不会挪动视口，下方的误差按模型算出一次滚动补偿即可
 */

export interface LayoutModel {
  /** 条目键，最早的在前 */
  keys: string[];
  heights: number[];
  /** 内容顶边到条目顶边 */
  topOffsets: number[];
  /** 内容底边到条目底边 */
  bottomOffsets: number[];
  total: number;
  indexByKey: Map<string, number>;
}

export interface RenderRange {
  start: number;
  /** 不含 */
  end: number;
}

export function buildLayoutModel(keys: string[], measured: ReadonlyMap<string, number>, estimate: number): LayoutModel {
  const count = keys.length;
  const heights = new Array<number>(count);
  const topOffsets = new Array<number>(count);
  const indexByKey = new Map<string, number>();
  let total = 0;
  for (let i = 0; i < count; i++) {
    const key = keys[i]!;
    const height = measured.get(key) ?? estimate;
    indexByKey.set(key, i);
    topOffsets[i] = total;
    heights[i] = height;
    total += height;
  }
  const bottomOffsets = topOffsets.map((top, i) => total - top - heights[i]!);
  return { keys, heights, topOffsets, bottomOffsets, total, indexByKey };
}

/** 与 [distance, distance + viewport] 相交的条目，两侧各多挂 overscan 条 */
export function visibleRange(layout: LayoutModel, distance: number, viewport: number, overscan: number): RenderRange {
  const count = layout.keys.length;
  if (count === 0) return { start: 0, end: 0 };
  const bottomEdge = Math.min(Math.max(0, distance), layout.total);
  const topEdge = Math.min(bottomEdge + Math.max(0, viewport), layout.total);
  const first = firstIndexWithBottomBelow(layout.bottomOffsets, topEdge);
  const pastLast = firstIndexWithTopAtOrBelow(layout.bottomOffsets, layout.heights, bottomEdge);
  return { start: Math.max(0, first - overscan), end: Math.min(count, Math.max(pastLast, first + 1) + overscan) };
}

// bottomOffsets 递减：第一个底边低于 limit 的条目，即伸进视口顶边的最上面一条
function firstIndexWithBottomBelow(bottomOffsets: number[], limit: number): number {
  let lo = 0;
  let hi = bottomOffsets.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (bottomOffsets[mid]! < limit) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

// 第一个顶边不高于 limit 的条目，即仍与视口底边相交的最下面一条的下一条
function firstIndexWithTopAtOrBelow(bottomOffsets: number[], heights: number[], limit: number): number {
  let lo = 0;
  let hi = bottomOffsets.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (bottomOffsets[mid]! + heights[mid]! <= limit) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export function rangeContains(outer: RenderRange, inner: RenderRange): boolean {
  return outer.start <= inner.start && outer.end >= inner.end;
}

/** 内容底边到条目底边：条目自己变高不会挪动这条边 */
export function bottomOf(layout: LayoutModel, key: string): number | null {
  const index = layout.indexByKey.get(key);
  return index === undefined ? null : layout.bottomOffsets[index]!;
}

/** 内容底边到条目顶边 */
export function topOf(layout: LayoutModel, key: string): number | null {
  const index = layout.indexByKey.get(key);
  return index === undefined ? null : layout.bottomOffsets[index]! + layout.heights[index]!;
}

/**
 * 视口里最下面一条完整测过的条目：读者盯着的那条线（它的底边）。
 * 内容变化后按这条线前后的位置差补偿滚动，线以上的变化（翻页、上方条目改高）不影响阅读位置
 */
export function readerAnchor(layout: LayoutModel, distance: number, viewport: number, measured: ReadonlyMap<string, number>): string | null {
  const range = visibleRange(layout, distance, viewport, 0);
  for (let i = range.end - 1; i >= range.start; i--) {
    const key = layout.keys[i]!;
    if (measured.has(key)) return key;
  }
  return null;
}
