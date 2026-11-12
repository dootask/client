import type { ReactNode } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { StyleSheet, UnistylesRuntime, useUnistyles } from 'react-native-unistyles';
import { scheduleOnRN } from 'react-native-worklets';

import { useBreakpoint } from '../theme';
import { resizeCursor } from './resizeCursor';

/** 列表和详情是否左右并排（中屏、宽屏）；窄屏是两级页，列表由路由的首页自己渲染 */
export function useSplitView(): boolean {
  return useBreakpoint() !== 'xs';
}

/** 同 useSplitView，给组件外的导航函数用 */
export function isSplitView(): boolean {
  return UnistylesRuntime.breakpoint !== 'xs';
}

/**
 * 列表 + 详情（architecture.md 第 7 节）：
 * - 窄屏：只渲染 children（详情的路由栈），列表是栈里的首页，详情整页推入
 * - 中屏：左边固定宽度的列表栏
 * - 宽屏：列表栏可以拖动右边缘调宽
 * children 的位置固定，切换断点时路由栈不会重新挂载
 *
 * width / onResize：宽屏下拖出来的宽度，由调用方负责存取；拖完松手时回调一次
 * dialog：消息页同旧版，列表栏占 30% 宽（限制在 240–320）、不能拖，和右边之间一条浅色竖线，右边白底
 */
export function ListDetail({
  list,
  children,
  width,
  onResize,
  dialog = false,
}: {
  list: ReactNode;
  children: ReactNode;
  width?: number;
  onResize?: (width: number) => void;
  dialog?: boolean;
}) {
  const breakpoint = useBreakpoint();
  const split = breakpoint !== 'xs';
  return (
    <View style={styles.root}>
      {split &&
        (dialog ? (
          <>
            <View style={styles.dialogPane}>{list}</View>
            <View style={styles.dialogLine} />
          </>
        ) : (
          <ListPane resizable={breakpoint === 'lg'} initialWidth={width} onResize={onResize}>
            {list}
          </ListPane>
        ))}
      <View style={styles.detail(dialog)}>{children}</View>
    </View>
  );
}

function ListPane({ resizable, initialWidth, onResize, children }: { resizable: boolean; initialWidth?: number; onResize?: (width: number) => void; children: ReactNode }) {
  const { theme } = useUnistyles();
  const { listPane, listPaneMin, listPaneMax } = theme.size;
  const clamp = (value: number) => {
    'worklet';
    return Math.min(listPaneMax, Math.max(listPaneMin, value));
  };
  // 拖动中的宽度只走 shared value，不触发重渲染
  const initial = clamp(initialWidth ?? listPane);
  const width = useSharedValue<number>(initial);
  const start = useSharedValue<number>(initial);

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
      width.set(clamp(start.get() + event.translationX));
    },
    onDeactivate: () => {
      'worklet';
      if (onResize && width.get() !== start.get()) scheduleOnRN(onResize, width.get());
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
  dialogPane: {
    width: `${theme.size.dialogPaneRatio * 100}%`,
    minWidth: theme.size.dialogPaneMin,
    maxWidth: theme.size.dialogPaneMax,
    backgroundColor: theme.colors.surface,
  },
  // 竖线在列表栏外面（旧版 .messenger-line），不占列表栏的 30%
  dialogLine: { width: 1, backgroundColor: theme.colors.paneLine },
  detail: (dialog: boolean) => ({
    flex: 1,
    minWidth: 0,
    backgroundColor: dialog ? theme.colors.surface : theme.colors.bg,
  }),
}));
