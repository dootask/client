import { createContext, useContext, useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { useStore, type Store } from './store';

/** 行框交给行内 RowHighlight 的闪烁信息；行框外（如长按菜单里重画的行）没有 */
export const HighlightContext = createContext<{ store: Store<string | null>; id: string; color: string } | null>(null);

/** 闪烁总时长，之后清掉高亮目标 */
const FLASH_DURATION = 1350;

/**
 * 跳转定位后目标行闪两下再淡出的底色，由使用方放在行内、自己决定盖住哪一块（如不盖日期分隔、上下留出一样的空）。
 * 绝对定位，默认铺满所在的视图，用 style 调整范围；放在内容前面，画在内容底下
 */
export function RowHighlight({ style }: { style?: StyleProp<ViewStyle> }) {
  const context = useContext(HighlightContext);
  return context && <HighlightOverlay {...context} style={style} />;
}

function HighlightOverlay({ store, id, color, style }: { store: Store<string | null>; id: string; color: string; style?: StyleProp<ViewStyle> }) {
  const active = useStore(store, (s) => s === id);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    opacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0.35, { duration: 200 }),
      withTiming(1, { duration: 200 }),
      withDelay(300, withTiming(0, { duration: 500 })),
    );
    const timer = setTimeout(() => store.set(null), FLASH_DURATION);
    return () => clearTimeout(timer);
  }, [active, opacity, store]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (!active) return null;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color }, style, overlayStyle]} />;
}
