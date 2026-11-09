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
