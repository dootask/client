import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useBreakpoint } from '../theme';

/** 导航的三种形态：窄屏底部 Tab、中屏图标侧栏、宽屏完整侧栏 */
export type NavVariant = 'tabs' | 'rail' | 'sidebar';

const VARIANT = { xs: 'tabs', md: 'rail', lg: 'sidebar' } as const satisfies Record<string, NavVariant>;

/**
 * 主框架（architecture.md 第 7 节）：按窗口宽度切换导航形态，内容区不动。
 * 三个位置的子元素顺序固定，切换断点时内容区不会重新挂载，页面状态和 URL 都保持。
 * hideTabBar：窄屏推入的二级页（聊天、设置子页）不显示底部 Tab
 */
export function AppFrame({ nav, hideTabBar = false, children }: { nav: (variant: NavVariant) => ReactNode; hideTabBar?: boolean; children: ReactNode }) {
  const variant = VARIANT[useBreakpoint()];
  return (
    <View style={styles.root}>
      {variant !== 'tabs' && <View style={styles.side}>{nav(variant)}</View>}
      <View style={styles.content}>{children}</View>
      {variant === 'tabs' && !hideTabBar && <View style={styles.tabBar}>{nav(variant)}</View>}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    flexDirection: { xs: 'column', md: 'row' },
  },
  side: {
    width: { md: theme.size.rail, lg: theme.size.sidebar },
    paddingTop: rt.insets.top,
    paddingBottom: rt.insets.bottom,
    paddingLeft: rt.insets.left,
    backgroundColor: theme.colors.nav,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.colors.separator,
  },
  content: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  tabBar: {
    paddingBottom: rt.insets.bottom,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.separator,
  },
}));
