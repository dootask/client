import { X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { type CSSTransitionProperties, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { IconButton } from '../IconButton';
import { useBreakpoint } from '../theme';

/** 进出场：Reanimated 的 CSS 过渡，Web 上是真正的 CSS transition，不占 JS 帧（性能规范第 8 条） */
const DURATION = 220;
const TRANSITION: CSSTransitionProperties = {
  transitionProperty: ['transform', 'opacity'],
  transitionDuration: DURATION,
  transitionTimingFunction: 'ease-out',
};
/** 下拉超过这个距离或速度就关闭 */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;
/** 回弹：临界阻尼，不过冲 */
const SPRING = { duration: 450, dampingRatio: 1 };

type Form = 'bottom' | 'center' | 'right';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** 中屏、宽屏上的形态：居中弹窗（默认）或右侧抽屉；窄屏一律是底部弹层 */
  wide?: 'center' | 'right';
  children: ReactNode;
}

/**
 * 弹层（architecture.md 第 7 节）：窄屏从底部弹出、可以下拉关闭；中屏和宽屏是居中弹窗或右侧抽屉。
 * 点遮罩、系统返回键、Web 上按 Esc 都会调 onClose。不打开不渲染，关闭动画放完才卸载。
 * 键盘避让和多层叠放在 W9（弹出层）和弹层栈一起做
 */
export function Sheet({ visible, onClose, title, wide = 'center', children }: SheetProps) {
  const t = useT();
  const form: Form = useBreakpoint() === 'xs' ? 'bottom' : wide;
  const [mounted, setMounted] = useState(visible);
  const [shown, setShown] = useState(false);
  const drag = useSharedValue(0);

  // 打开、关闭的状态在渲染时同步，effect 里只做定时
  if (visible && !mounted) setMounted(true);
  if (!visible && shown) setShown(false);

  useEffect(() => {
    if (visible) {
      // 先以收起的样子画出来，下一帧再展开，过渡才会生效
      const frame = requestAnimationFrame(() => {
        drag.set(0);
        setShown(true);
      });
      return () => cancelAnimationFrame(frame);
    }
    const timer = setTimeout(() => setMounted(false), DURATION);
    return () => clearTimeout(timer);
  }, [visible, drag]);

  // 只有顶部（拖拽条和标题栏）响应下拉，内容区留给滚动和输入
  const pan = usePanGesture({
    enabled: form === 'bottom',
    maxPointers: 1,
    activeOffsetY: 8,
    failOffsetY: -8,
    onUpdate: (event) => {
      'worklet';
      drag.set(Math.max(0, event.translationY));
    },
    onDeactivate: (event) => {
      'worklet';
      if (!event.canceled && (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY)) {
        runOnJS(onClose)();
        return;
      }
      drag.set(withSpring(0, SPRING));
    },
  });
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drag.get() }],
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={FILL}>
        <View style={styles.root(form)}>
          <Animated.View style={[styles.backdrop(shown), TRANSITION]}>
            <Pressable style={styles.fill} onPress={onClose} accessibilityLabel={t('close')} />
          </Animated.View>
          <Animated.View style={[styles.panel(form, shown), TRANSITION]}>
            <Animated.View style={[styles.panelInner, dragStyle]}>
              <GestureDetector gesture={pan}>
                <View collapsable={false}>
                  {form === 'bottom' && <View style={styles.grabber} />}
                  {title !== undefined && (
                    <View style={styles.bar}>
                      <View style={styles.barSide} />
                      <Text style={styles.title} numberOfLines={1}>
                        {title}
                      </Text>
                      <View style={[styles.barSide, styles.barSideRight]}>
                        <IconButton icon={X} label={t('close')} onPress={onClose} />
                      </View>
                    </View>
                  )}
                </View>
              </GestureDetector>
              <View style={styles.content}>{children}</View>
            </Animated.View>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** GestureHandlerRootView 不经过 unistyles 的 babel 插件，只给它普通样式 */
const FILL = { flex: 1 };

const styles = StyleSheet.create((theme, rt) => ({
  root: (form: Form) => ({
    flex: 1,
    justifyContent: form === 'bottom' ? 'flex-end' : 'center',
    alignItems: form === 'center' ? 'center' : form === 'right' ? 'flex-end' : 'stretch',
  }),
  fill: {
    flex: 1,
  },
  backdrop: (shown: boolean) => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
    opacity: shown ? 1 : 0,
  }),
  panel: (form: Form, shown: boolean) => {
    if (form === 'bottom') {
      return {
        maxHeight: rt.screen.height - rt.insets.top - theme.spacing.xxl * 2,
        paddingBottom: rt.insets.bottom + theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.radius.sheet,
        borderTopRightRadius: theme.radius.sheet,
        transform: [{ translateY: shown ? '0%' : '100%' }],
      };
    }
    if (form === 'right') {
      return {
        height: '100%',
        width: theme.size.dialogWidth,
        maxWidth: '92%',
        paddingTop: rt.insets.top,
        paddingBottom: rt.insets.bottom,
        backgroundColor: theme.colors.surface,
        boxShadow: theme.shadow.popover,
        transform: [{ translateX: shown ? '0%' : '100%' }],
      };
    }
    return {
      width: theme.size.dialogWidth,
      maxWidth: '92%',
      maxHeight: '85%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.dialog,
      boxShadow: theme.shadow.popover,
      opacity: shown ? 1 : 0,
      transform: [{ scale: shown ? 1 : 0.96 }],
    };
  },
  panelInner: {
    flexShrink: 1,
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: theme.size.grabberWidth,
    height: theme.size.grabberHeight,
    borderRadius: theme.radius.pill,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.text4,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.size.navBar,
    paddingHorizontal: theme.spacing.sm,
  },
  barSide: {
    width: theme.size.touch,
  },
  barSideRight: {
    alignItems: 'flex-end',
  },
  title: {
    ...theme.typography.title2,
    flex: 1,
    textAlign: 'center',
    color: theme.colors.text,
  },
  content: {
    flexShrink: 1,
  },
}));
