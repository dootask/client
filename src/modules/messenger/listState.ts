import { create } from 'zustand';

import type { ListCategory } from './listModel';

/**
 * 会话列表的界面状态。窄屏的列表在首页路由、宽屏在列表栏，两处是不同的组件实例，
 * 状态放这里，切换断点时分类和搜索词保持
 */
export const useDialogListState = create<{ category: ListCategory; key: string }>()(() => ({ category: '', key: '' }));

type JumpHandler = () => void;
let jumpHandler: JumpHandler | null = null;

/** 列表挂载时注册「跳到下一个未读」，卸载时注销 */
export function setUnreadJumpHandler(fn: JumpHandler | null) {
  jumpHandler = fn;
}

/** 已在「消息」Tab 时再点一次：滚到下一个有未读的会话（R12） */
export function jumpToNextUnread() {
  jumpHandler?.();
}
