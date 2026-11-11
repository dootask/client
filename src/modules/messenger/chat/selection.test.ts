import { describe, expect, it } from 'vitest';

import { createSelection, SELECTION_MAX } from './selection';

describe('selection', () => {
  it('点选和取消', () => {
    const s = createSelection();
    s.start(1);
    expect(s.toggle(2)).toBe(true);
    expect(s.toggle(1)).toBe(true);
    expect([...s.store.getState().ids]).toEqual([2]);
    s.clear();
    expect(s.store.getState()).toMatchObject({ active: false, anchor: 0 });
  });

  it('Shift 从锚点连选，两个方向都行', () => {
    const s = createSelection();
    const order = [10, 11, 12, 13, 14];
    s.start(12);
    s.extend(14, order);
    expect([...s.store.getState().ids].sort()).toEqual([12, 13, 14]);
    s.extend(10, order);
    expect([...s.store.getState().ids].sort()).toEqual([10, 11, 12, 13, 14]);
  });

  it('不超过上限', () => {
    const s = createSelection();
    const order = Array.from({ length: SELECTION_MAX + 5 }, (_, i) => i + 1);
    s.start(1);
    expect(s.extend(order.length, order)).toBe(false);
    expect(s.store.getState().ids.size).toBe(SELECTION_MAX);
    expect(s.toggle(order.length)).toBe(false);
  });
});

describe('C5 拖动连续勾选', () => {
  const order = [1, 2, 3, 4, 5];
  it('从起点拖到哪就勾到哪，往回拖会退回到开始时的样子', () => {
    const s = createSelection();
    s.start(5);
    const base = s.store.getState().ids;
    s.paint(base, 1, 3, order, true);
    expect([...s.store.getState().ids].sort()).toEqual([1, 2, 3, 5]);
    s.paint(base, 1, 1, order, true);
    expect([...s.store.getState().ids].sort()).toEqual([1, 5]);
  });
  it('从已选的那条开始拖是取消', () => {
    const s = createSelection();
    s.start(1);
    s.toggle(2);
    s.toggle(3);
    s.paint(s.store.getState().ids, 2, 3, order, false);
    expect([...s.store.getState().ids]).toEqual([1]);
  });
  it('超过上限时勾到上限为止', () => {
    const s = createSelection();
    const many = Array.from({ length: SELECTION_MAX + 5 }, (_, i) => i + 1);
    s.start(1);
    expect(s.paint(s.store.getState().ids, 1, many.length, many, true)).toBe(false);
    expect(s.store.getState().ids.size).toBe(SELECTION_MAX);
  });
});
