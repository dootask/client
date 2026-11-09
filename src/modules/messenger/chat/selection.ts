import { createStore } from 'zustand/vanilla';

/** 一次最多转发的消息数（与服务端一致） */
export const SELECTION_MAX = 100;

export interface SelectionState {
  active: boolean;
  ids: ReadonlySet<number>;
  /** 上一次点选的那条：Shift 点选从它连到当前这条 */
  anchor: number;
}

export type Selection = ReturnType<typeof createSelection>;

/** 聊天页的多选：每个聊天页一份，行组件只订阅自己是否被选中 */
export function createSelection() {
  const store = createStore<SelectionState>()(() => ({ active: false, ids: new Set(), anchor: 0 }));
  return {
    store,
    start(id: number) {
      store.setState({ active: true, ids: new Set([id]), anchor: id });
    },
    clear() {
      store.setState({ active: false, ids: new Set(), anchor: 0 });
    },
    /** 点选一条；超过上限返回 false */
    toggle(id: number): boolean {
      const ids = new Set(store.getState().ids);
      if (ids.has(id)) ids.delete(id);
      else if (ids.size >= SELECTION_MAX) return false;
      else ids.add(id);
      store.setState({ ids, anchor: id });
      return true;
    },
    /** Shift 点选：order 是按显示顺序排好的可选消息，把锚点到 id 之间的都选上；超过上限时选到上限为止并返回 false */
    extend(id: number, order: readonly number[]): boolean {
      const { anchor } = store.getState();
      const from = order.indexOf(anchor);
      const to = order.indexOf(id);
      if (from < 0 || to < 0) return this.toggle(id);
      const ids = new Set(store.getState().ids);
      let ok = true;
      for (const target of order.slice(Math.min(from, to), Math.max(from, to) + 1)) {
        if (ids.has(target)) continue;
        if (ids.size >= SELECTION_MAX) {
          ok = false;
          break;
        }
        ids.add(target);
      }
      store.setState({ ids, anchor: id });
      return ok;
    },
  };
}
