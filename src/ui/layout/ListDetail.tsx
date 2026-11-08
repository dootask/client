import type { ReactNode } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useBreakpoint } from '../theme';
import { resizeCursor } from './resizeCursor';

/** 列表和详情是否左右并排（中屏、宽屏）；窄屏是两级页，列表由路由的首页自己渲染 */
export function useSplitView(): boolean {
  return useBreakpoint() !== 'xs';
}

/**
 * 列表 + 详情（architecture.md 第 7 节）：
 * - 窄屏：只渲染 children（详情的路由栈），列表是栈里的首页，详情整页推入
 * - 中屏：左边固定宽度的列表栏
 * - 宽屏：列表栏可以拖动右边缘调宽
 * children 的位置固定，切换断点时路由栈不会重新挂载
 */
export function ListDetail({ list, children }: { list: ReactNode; children: ReactNode }) {
  const breakpoint = useBreakpoint();
  return (
    <View style={styles.root}>
      {breakpoint !== 'xs' && <ListPane resizable={breakpoint === 'lg'}>{list}</ListPane>}
      <View style={styles.detail}>{children}</View>
    </View>
  );
}

function ListPane({ resizable, children }: { resizable: boolean; children: ReactNode }) {
  const { theme } = useUnistyles();
  const { listPane, listPaneMin, listPaneMax } = theme.size;
  // 拖动中的宽度只走 shared value，不触发重渲染
  const width = useSharedValue<number>(listPane);
  const start = useSharedValue<number>(listPane);

  const pan = usePanGesture({
    enabled: resizable,
    maxPointers: 1,
    activeOffsetX: [-2, 2],
    onActivate: () => {
      'worklet';
      start.set(width.get());
    },
    onUpdate: (event) => {
      'worklet';
      width.set(Math.min(listPaneMax, Math.max(listPaneMin, start.get() + event.translationX)));
    },
  });

  const paneStyle = useAnimatedStyle(() => ({ width: resizable ? width.get() : listPane }));

  return (
    // 动画宽度单独放外层，unistyles 的样式放里层，两边互不覆盖
    <Animated.View style={paneStyle}>
      <View style={styles.list}>{children}</View>
      {resizable && (
        <GestureDetector gesture={pan}>
          <View style={[styles.handle, resizeCursor]} />
        </GestureDetector>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  list: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.colors.separator,
  },
  // 右边缘的拖动条：比分割线宽，方便抓到
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: -theme.spacing.xs,
    width: theme.spacing.sm,
    zIndex: 1,
  },
  detail: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.bg,
  },
}));
