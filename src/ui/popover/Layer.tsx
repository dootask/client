import { type ReactNode, type Ref, useState } from 'react';
import { type HostInstance, type LayoutChangeEvent, Modal, type StyleProp, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, { type CSSTransitionProperties } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Backdrop } from './Backdrop';
import { type Align, place, type Rect, type Side, type Size } from './position';

/** 取元素在窗口里的位置，作为弹出层的锚点 */
export function measureAnchor(view: HostInstance | null): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!view) return resolve(null);
    view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}

/** 右键菜单：鼠标位置当作宽高为 0 的锚点 */
export const pointAnchor = (x: number, y: number): Rect => ({ x, y, width: 0, height: 0 });

export interface LayerProps {
  onClose: () => void;
  /** Web 上按 Esc、Android 上按返回键；默认等于 onClose */
  onRequestClose?: () => void;
  children: ReactNode;
}

/**
 * 弹出层的承载：一个透明的全屏层，点外面（含右键）关闭。只在打开时由调用方渲染，
 * 不打开就不存在，也就不挂任何监听（性能规范弹出层一条）
 */
export function Layer({ onClose, onRequestClose = onClose, children }: LayerProps) {
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onRequestClose}>
      <Backdrop onClose={onClose} />
      {children}
    </Modal>
  );
}

const TRANSITION: CSSTransitionProperties = {
  transitionProperty: ['opacity', 'transform'],
  transitionDuration: 120,
  transitionTimingFunction: 'ease-out',
};

export interface PositionedProps {
  anchor: Rect;
  side?: Side;
  align?: Align;
  /** 与锚点的间距，默认 spacing.xs */
  gap?: number;
  /** 叠在默认面板样式（表面色、圆角、阴影）之上 */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  ref?: Ref<HostInstance>;
}

/**
 * 按锚点定位的面板：第一帧不可见、不接鼠标地量出自然尺寸，再按 place() 放到位并淡入。
 * 放在 Layer 或铺满窗口的容器里，坐标即窗口坐标
 */
export function Positioned({ anchor, side = 'bottom', align = 'start', gap, style, children, ref }: PositionedProps) {
  const { theme } = useUnistyles();
  const viewport = useWindowDimensions();
  const [size, setSize] = useState<Size | null>(null);
  const onLayout = (event: LayoutChangeEvent) => {
    if (size) return;
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };
  const placement = size ? place({ anchor, size, viewport, side, align, gap: gap ?? theme.spacing.xs, margin: theme.spacing.sm }) : null;
  return (
    <Animated.View ref={ref} onLayout={onLayout} style={[styles.panel(placement), style, TRANSITION]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  panel: (placement: ReturnType<typeof place> | null) => ({
    position: 'absolute',
    left: placement?.left ?? 0,
    top: placement?.top ?? 0,
    maxWidth: placement?.maxWidth,
    maxHeight: placement?.maxHeight,
    opacity: placement ? 1 : 0,
    // 量尺寸那一帧还在左上角，不能接鼠标，否则悬停会落到看不见的面板上
    pointerEvents: placement ? 'auto' : 'none',
    transform: [{ scale: placement ? 1 : 0.98 }],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    boxShadow: theme.shadow.popover,
    overflow: 'hidden',
  }),
}));
