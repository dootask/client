import { Reply } from 'lucide-react-native';
import { useCallback, useRef } from 'react';
import { type GestureResponderEvent, Pressable, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '../../../platform/haptics';
import { Icon } from '../../../ui/Icon';
import type { BubbleTouchProps, RowRef } from './bubbleTouchTypes';

const DOUBLE_TAP_MS = 300;
const LONG_PRESS_MS = 350;
/** 按下到抬起移动超过这个距离就不算点按（快速滑动列表时手指已抬起，系统还没取消点按） */
const TAP_SLOP = 8;
/** 右滑：水平移动多少开始跟手、竖直移动多少让给列表滚动、越过多少松手触发、最多拖多远 */
const SWIPE_ACTIVE = 14;
const SWIPE_FAIL_Y = 10;
const SWIPE_TRIGGER = 56;
const SWIPE_MAX = 80;
/** 越过阈值后的阻尼 */
const SWIPE_DAMPING = 0.3;
/** 松手归位：减速曲线，不过冲 */
const SWIPE_BACK = { duration: 220, easing: Easing.out(Easing.cubic) };

/** App：点按、双击点赞、长按出浮起菜单、气泡右滑回复（整行跟手，左侧露出回复图标） */
export function BubbleTouch({ rowStyle, bubbleStyle, leading, onPress, onLongPress, onReply, onDoubleTap, children }: BubbleTouchProps) {
  const { theme } = useUnistyles();
  const rowRef = useRef<RowRef>(null);
  const pressStart = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);

  const doubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current > DOUBLE_TAP_MS) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    haptics.light();
    onDoubleTap?.();
  }, [onDoubleTap]);
  // 只看有没有回调，不在渲染时碰带 ref 的 doubleTap
  const tappable = !!onPress || !!onDoubleTap;
  const longPress = useCallback(() => {
    if (rowRef.current) onLongPress?.(rowRef.current);
  }, [onLongPress]);
  const swipe = useSwipeReply(onReply);

  const bubble = (
    <Pressable
      disabled={!tappable && !onLongPress}
      onPressIn={(event: GestureResponderEvent) => {
        pressStart.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
      }}
      onPress={
        tappable
          ? (event: GestureResponderEvent) => {
              const { pageX, pageY } = event.nativeEvent;
              if (Math.hypot(pageX - pressStart.current.x, pageY - pressStart.current.y) > TAP_SLOP) return;
              if (onPress) onPress();
              else doubleTap();
            }
          : undefined
      }
      onLongPress={onLongPress ? longPress : undefined}
      delayLongPress={LONG_PRESS_MS}
      style={bubbleStyle}
    >
      {children}
    </Pressable>
  );
  const row = (
    <View ref={rowRef} collapsable={false} style={rowStyle}>
      {leading !== undefined && leading}
      {/* 右滑只在气泡上触发，气泡外的空白留给系统侧滑返回 */}
      {onReply ? <GestureDetector gesture={swipe.pan}>{bubble}</GestureDetector> : bubble}
    </View>
  );
  if (!onReply) return row;
  return (
    <View collapsable={false}>
      <Animated.View style={[styles.swipeIcon, swipe.iconStyle]} pointerEvents="none">
        <View style={styles.swipeCircle}>
          <Icon icon={Reply} color={theme.colors.text2} size={theme.size.iconSmall} />
        </View>
      </Animated.View>
      <Animated.View style={swipe.rowStyle}>{row}</Animated.View>
    </View>
  );
}

/** 气泡右滑：越过阈值震一下，松手触发，回弹 */
function useSwipeReply(onSwipe: (() => void) | undefined) {
  const dx = useSharedValue(0);
  const passed = useSharedValue(false);
  const pan = usePanGesture({
    enabled: !!onSwipe,
    // 只设单个正数：只响应右滑，且不抢气泡的点按、长按
    activeOffsetX: SWIPE_ACTIVE,
    failOffsetY: [-SWIPE_FAIL_Y, SWIPE_FAIL_Y],
    onUpdate: (event) => {
      'worklet';
      const x = Math.max(0, event.translationX);
      dx.set(Math.min(SWIPE_MAX, x < SWIPE_TRIGGER ? x : SWIPE_TRIGGER + (x - SWIPE_TRIGGER) * SWIPE_DAMPING));
      const over = x >= SWIPE_TRIGGER;
      if (over !== passed.get()) {
        passed.set(over);
        if (over) runOnJS(haptics.light)();
      }
    },
    onDeactivate: (event) => {
      'worklet';
      if (!event.canceled && passed.get() && onSwipe) runOnJS(onSwipe)();
    },
    onFinalize: () => {
      'worklet';
      passed.set(false);
      dx.set(withTiming(0, SWIPE_BACK));
    },
  });
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dx.get() }] }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dx.get(), [SWIPE_ACTIVE, SWIPE_TRIGGER], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(dx.get(), [SWIPE_ACTIVE, SWIPE_TRIGGER], [0.5, 1], 'clamp') }],
  }));
  return { pan, rowStyle, iconStyle };
}

const styles = StyleSheet.create((theme) => ({
  // 回复图标在整行左侧露出（自己的消息也从左边拉出来）
  swipeIcon: { position: 'absolute', left: theme.spacing.page, top: 0, bottom: 0, justifyContent: 'center' },
  swipeCircle: {
    width: theme.size.voicePlay,
    height: theme.size.voicePlay,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.fill,
  },
}));
