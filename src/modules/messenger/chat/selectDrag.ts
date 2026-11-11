import { useMemo, useRef } from 'react';
import type { HostInstance } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { measureInWindow } from '../../../ui/chat';
import type { Selection } from './selection';

interface RowRect {
  id: number;
  top: number;
  bottom: number;
}

export type SelectDrag = ReturnType<typeof useSelectDrag>;

/**
 * C5 从勾选圈上下拖动连续勾选（只有 App 接手势，Web 用 Shift 点选）：
 * 开始拖时量好屏幕上的可选行并锁住列表滚动，手指经过的行按起点那条原来选没选统一勾上或取消
 */
export function useSelectDrag(selection: Selection, onLimit: () => void) {
  const rows = useRef(new Map<number, HostInstance>());
  const drag = useRef<{ anchor: number; base: ReadonlySet<number>; adding: boolean; rects: RowRect[]; y: number | null; limited: boolean } | null>(null);
  const scrollLock = useSharedValue(false);

  return useMemo(() => {
    const apply = () => {
      const state = drag.current;
      if (!state || state.y === null) return;
      const y = state.y;
      const to = state.rects.find((rect) => y >= rect.top && y < rect.bottom);
      if (!to) return;
      const ok = selection.paint(state.base, state.anchor, to.id, state.rects.map((rect) => rect.id), state.adding);
      if (!ok && !state.limited) onLimit();
      state.limited = !ok;
    };
    return {
      scrollLock,
      register(id: number, view: HostInstance | null) {
        if (view) rows.current.set(id, view);
        else rows.current.delete(id);
      },
      begin(anchor: number) {
        const base = selection.store.getState().ids;
        const state = { anchor, base, adding: !base.has(anchor), rects: [] as RowRect[], y: null as number | null, limited: false };
        drag.current = state;
        scrollLock.set(true);
        const measure = ([id, view]: [number, HostInstance]) => measureInWindow(view).then(({ y, height }): RowRect => ({ id, top: y, bottom: y + height }));
        Promise.all([...rows.current].map(measure))
          .then((rects) => {
            state.rects = rects.sort((a, b) => a.top - b.top);
            apply();
          })
          .catch(() => {});
      },
      move(y: number) {
        if (!drag.current) return;
        drag.current.y = y;
        apply();
      },
      end() {
        drag.current = null;
        scrollLock.set(false);
      },
    };
  }, [selection, onLimit, scrollLock]);
}
