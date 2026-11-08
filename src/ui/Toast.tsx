import { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

/**
 * 轻提示：一句话浮在屏幕下方，几秒后自动消失，不打断操作。用于后台操作的结果（如菜单操作失败）。
 * 全应用一个提示层（ToastHost，挂在根布局里），新的顶掉旧的
 */

interface ToastItem {
  id: number;
  text: string;
}

const DURATION = 2500;

let current: ToastItem | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit(item: ToastItem | null) {
  current = item;
  for (const listener of listeners) listener();
}

export function showToast(text: string) {
  clearTimeout(timer);
  emit({ id: ++seq, text });
  timer = setTimeout(() => emit(null), DURATION);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export function ToastHost() {
  const item = useSyncExternalStore(subscribe, () => current);
  if (!item) return null;
  return (
    <View style={styles.root} pointerEvents="none">
      <Animated.View key={item.id} entering={FadeIn} exiting={FadeOut} style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Text style={styles.text}>{item.text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: rt.insets.bottom + theme.size.tabBar + theme.spacing.xxl,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
  },
  toast: {
    maxWidth: theme.size.bubbleMaxWidth,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm + theme.spacing.xs,
    borderRadius: theme.radius.block,
    backgroundColor: theme.colors.toast,
  },
  text: {
    ...theme.typography.subhead,
    color: theme.colors.onToast,
    textAlign: 'center',
  },
}));
