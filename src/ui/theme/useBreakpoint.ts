import { useUnistyles } from 'react-native-unistyles';

import type { breakpoints } from './tokens';

export type Breakpoint = keyof typeof breakpoints;

/**
 * 当前断点。只在断点变化时重渲染（unistyles 按读到的字段订阅），
 * 拖动窗口宽度时不会每一帧都重渲染。只有结构不同的布局才需要它，单纯的样式差异写在 StyleSheet 里
 */
export function useBreakpoint(): Breakpoint {
  const { rt } = useUnistyles();
  return (rt.breakpoint as Breakpoint | undefined) ?? 'xs';
}
