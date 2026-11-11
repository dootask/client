import { create } from 'zustand';

import { kv, KV_KEYS } from '../../sync/storage';
import { CATEGORIES, type ListCategory } from './listModel';

/**
 * 会话列表的界面状态。窄屏的列表在首页路由、宽屏在列表栏，两处是不同的组件实例，
 * 状态放这里，切换断点时分类和搜索词保持。
 * navOrder 是分类条的顺序（同旧版）：按各分类最近一次选中的时间排，「全部」永远最新；
 * 只在启动时排一次，用着的时候顺序不变，下次打开才按新的时间排
 */
export const useDialogListState = create<{ category: ListCategory; key: string; navOrder: readonly ListCategory[] }>()(() => ({
  category: '',
  key: '',
  navOrder: loadNavOrder(),
}));

type NavHistory = Partial<Record<ListCategory, number>>;

function readHistory(): NavHistory {
  try {
    const raw = kv.getString(KV_KEYS.dialogNavHistory);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as NavHistory) : {};
  } catch {
    return {};
  }
}

function loadNavOrder(): ListCategory[] {
  const history = readHistory();
  const time = (c: ListCategory) => (typeof history[c] === 'number' ? history[c] : 0);
  // sort 是稳定排序：没选过的保持默认顺序
  return [...CATEGORIES].sort((a, b) => time(b) - time(a));
}

/** 切换分类：记下选中时间，留给下次打开时排序 */
export function selectCategory(category: ListCategory) {
  const now = Date.now();
  kv.set(KV_KEYS.dialogNavHistory, JSON.stringify({ ...readHistory(), [category]: now, '': now + 1 }));
  useDialogListState.setState({ category });
}

type ShakeHandler = () => void;
let shakeHandler: ShakeHandler | null = null;

/** 列表挂载时注册「晃动未读」，卸载时注销 */
export function setShakeHandler(fn: ShakeHandler | null) {
  shakeHandler = fn;
}

/** 已在「消息」Tab 时再点一次、再点当前分类：滚到第一个有未读的会话并晃动它（同旧版） */
export function shakeUnread() {
  shakeHandler?.();
}
