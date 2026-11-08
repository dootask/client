import { useCallback, useContext, useRef, type ComponentRef } from 'react';
import type { View } from 'react-native';

import { ChatViewContext } from './context';

type ViewInstance = ComponentRef<typeof View>;

function heightOf(view: ViewInstance): number {
  // 倒置列表里带着翻转，高度可能是负的
  return Math.abs(view.getBoundingClientRect().height);
}

/**
 * 消息内的展开 / 收起保持顶部不动。
 * 倒置列表里消息变高时底边不动、往上长；用户点开折叠内容时应该是顶边不动、往下展开。
 * 用法：ref 挂在消息内容根节点；改展开状态前调 expect()，改完的那次提交里（展开状态所在组件的 useLayoutEffect）调 settle()。
 * 高度在提交时同步量出，滚动补偿与新布局同一帧上屏，不会先闪一下再归位。
 * 不在 ChatView 里（如长按菜单浮起的消息）时什么也不做。
 */
export function useKeepTop() {
  const scrollBy = useContext(ChatViewContext)?.scrollBy;
  const ref = useRef<ViewInstance>(null);
  const before = useRef<number | null>(null);

  const expect = useCallback(() => {
    before.current = ref.current ? heightOf(ref.current) : null;
  }, []);

  const settle = useCallback(() => {
    const prev = before.current;
    before.current = null;
    if (prev === null || !ref.current) return;
    const delta = heightOf(ref.current) - prev;
    if (delta !== 0) scrollBy?.(delta);
  }, [scrollBy]);

  return { ref, expect, settle };
}
