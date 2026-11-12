/** 弹出层定位（纯计算，vitest 覆盖）：贴边时翻到另一侧，放不下时夹在可视区内并限制尺寸 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';

export interface PlaceOptions {
  /** 锚点：触发元素的矩形；右键菜单传宽高为 0 的鼠标位置 */
  anchor: Rect;
  /** 弹出层的自然尺寸 */
  size: Size;
  viewport: Size;
  /** 首选方向，放不下且对面更宽敞时翻过去 */
  side: Side;
  /** 交叉轴对齐；start 放不下时先试 end，再夹到可视区内 */
  align: Align;
  /** 与锚点的间距 */
  gap: number;
  /** 与可视区边缘的最小距离 */
  margin: number;
}

export interface Placement {
  left: number;
  top: number;
  side: Side;
  /** 主轴方向剩余空间放不下自然尺寸时的上限，交叉轴同理 */
  maxWidth: number;
  maxHeight: number;
}

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/** 某一侧在主轴上能用的空间 */
function room(side: Side, anchor: Rect, viewport: Size, gap: number, margin: number): number {
  switch (side) {
    case 'top':
      return anchor.y - gap - margin;
    case 'bottom':
      return viewport.height - (anchor.y + anchor.height) - gap - margin;
    case 'left':
      return anchor.x - gap - margin;
    case 'right':
      return viewport.width - (anchor.x + anchor.width) - gap - margin;
  }
}

/** 交叉轴：按对齐方式算起点，越界时 start ↔ end 互换，仍越界就夹到可视区内 */
function cross(align: Align, start: number, length: number, size: number, limit: number, margin: number): number {
  const at = (a: Align) => (a === 'start' ? start : a === 'end' ? start + length - size : start + (length - size) / 2);
  const fits = (pos: number) => pos >= margin && pos + size <= limit - margin;
  let pos = at(align);
  if (!fits(pos) && align !== 'center') {
    const flipped = at(align === 'start' ? 'end' : 'start');
    if (fits(flipped)) pos = flipped;
  }
  return Math.max(margin, Math.min(pos, limit - margin - size));
}

export function place({ anchor, size, viewport, side, align, gap, margin }: PlaceOptions): Placement {
  const vertical = side === 'top' || side === 'bottom';
  const need = vertical ? size.height : size.width;
  let chosen = side;
  const preferred = room(side, anchor, viewport, gap, margin);
  if (preferred < need) {
    const other = room(OPPOSITE[side], anchor, viewport, gap, margin);
    if (other > preferred) chosen = OPPOSITE[side];
  }
  const mainRoom = Math.max(0, room(chosen, anchor, viewport, gap, margin));
  const crossRoom = Math.max(0, (vertical ? viewport.width : viewport.height) - margin * 2);
  const width = Math.min(size.width, vertical ? crossRoom : mainRoom);
  const height = Math.min(size.height, vertical ? mainRoom : crossRoom);

  let left: number;
  let top: number;
  if (vertical) {
    left = cross(align, anchor.x, anchor.width, width, viewport.width, margin);
    top = chosen === 'bottom' ? anchor.y + anchor.height + gap : anchor.y - gap - height;
  } else {
    top = cross(align, anchor.y, anchor.height, height, viewport.height, margin);
    left = chosen === 'right' ? anchor.x + anchor.width + gap : anchor.x - gap - width;
  }
  return { left, top, side: chosen, maxWidth: vertical ? crossRoom : mainRoom, maxHeight: vertical ? mainRoom : crossRoom };
}

/**
 * 右键菜单：左上角放在鼠标位置，超出可视区就贴着边缘往回推（不翻转），比可视区还大时才限制尺寸。
 * 锚点在多大的元素上都不影响（气泡占满整屏时菜单照样完整显示）
 */
export function placeAtPoint({ point, size, viewport, margin }: { point: { x: number; y: number }; size: Size; viewport: Size; margin: number }): Placement {
  const maxWidth = Math.max(0, viewport.width - margin * 2);
  const maxHeight = Math.max(0, viewport.height - margin * 2);
  const clamp = (pos: number, length: number, limit: number) => Math.max(margin, Math.min(pos, limit - margin - length));
  return {
    left: clamp(point.x, Math.min(size.width, maxWidth), viewport.width),
    top: clamp(point.y, Math.min(size.height, maxHeight), viewport.height),
    side: 'bottom',
    maxWidth,
    maxHeight,
  };
}
