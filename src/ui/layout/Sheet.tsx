import { X } from 'lucide-react-native';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { type CSSTransitionProperties, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { IconButton } from '../IconButton';
import { ToastHost } from '../Toast';
import { Touchable } from '../Touchable';
import { bottomInset, useBreakpoint } from '../theme';

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

/** 顶栏右上的确认操作（如「发送」「完成」）：有它时左上是「取消」，没有时右上是 × */
export interface SheetConfirm {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** 提交中：转圈，不能再点 */
  busy?: boolean;
  destructive?: boolean;
}

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** 中屏、宽屏上的形态：居中弹窗（默认）或右侧抽屉；窄屏一律是底部弹层 */
  wide?: 'center' | 'right';
  confirm?: SheetConfirm;
  /** 顶栏左上自定义（如分级页的「‹ 上一级」）：给了它没有 confirm 时右上留空 */
  left?: ReactNode;
  /** 占满可用高度：内容是会变长的列表时，加载、搜索后不跳高；内容区可用 flex: 1 */
  fill?: boolean;
  /** 弹层展开后：要弹键盘的聚焦放在这里（安卓上弹层窗口拿到焦点前聚焦，输入框有焦点但不弹键盘） */
  onShow?: () => void;
  /** 关闭动画放完、弹层卸载后：要把焦点还给底下的输入框放在这里（弹层还在时聚焦会被它收走） */
  onHidden?: () => void;
  children: ReactNode;
}

/**
 * 弹层（architecture.md 第 7 节）：窄屏从底部弹出、可以下拉关闭；中屏和宽屏是居中弹窗或右侧抽屉。
 * 点遮罩、系统返回键、Web 上按 Esc 都会调 onClose。不打开不渲染，关闭动画放完才卸载。
 * 键盘弹出时整体抬到键盘上方
 */
export function Sheet({ visible, onClose, title, wide = 'center', confirm, left, fill = false, onShow, onHidden, children }: SheetProps) {
  const t = useT();
  const { theme } = useUnistyles();
  const form: Form = useBreakpoint() === 'xs' ? 'bottom' : wide;
  const [mounted, setMounted] = useState(visible);
  const [shown, setShown] = useState(false);
  const drag = useSharedValue(0);
  const showTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hidden = useRef(onHidden);
  const open = useRef(visible);
  useLayoutEffect(() => {
    hidden.current = onHidden;
    open.current = visible;
  });
  // 卸载之后再回调：Web 上弹窗卸载时把焦点还给打开前的元素，早了会被它覆盖
  const wasMounted = useRef(false);
  useEffect(() => {
    if (mounted) wasMounted.current = true;
    else if (wasMounted.current) {
      wasMounted.current = false;
      hidden.current?.();
    }
  }, [mounted]);

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
    clearTimeout(showTimer.current);
    const timer = setTimeout(() => setMounted(false), DURATION);
    return () => clearTimeout(timer);
  }, [visible, drag]);
  useEffect(() => () => clearTimeout(showTimer.current), []);

  // 窗口显示时安卓上还没拿到输入焦点（这时弹键盘会被系统忽略），等展开动画放完再回调
  const handleShow = onShow && (() => {
    showTimer.current = setTimeout(onShow, DURATION);
  });

  // onClose 是关闭请求，调用方可能不关（如先退回上一级）：下一帧还开着就回弹
  const dragClose = () => {
    onClose();
    requestAnimationFrame(() => {
      if (open.current) drag.set(withSpring(0, SPRING));
    });
  };

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
        runOnJS(dragClose)();
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
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose} onShow={handleShow}>
      <GestureHandlerRootView style={FILL}>
        <View style={styles.root(form)}>
          <Animated.View style={[styles.backdrop(shown), TRANSITION]}>
            <Pressable style={styles.fill} onPress={onClose} accessibilityLabel={t('close')} />
          </Animated.View>
          <Animated.View style={[styles.panel(form, shown), fill && styles.panelFill(form), TRANSITION]}>
            <Animated.View style={[styles.panelInner(form), dragStyle]}>
              <GestureDetector gesture={pan}>
                <View collapsable={false}>
                  {form === 'bottom' && <View style={styles.grabber} />}
                  {title !== undefined && (
                    <View style={styles.bar(form)}>
                      <View style={styles.barSide}>
                        {left}
                        {!left && confirm && (
                          <Touchable accessibilityRole="button" onPress={onClose} style={({ pressed, hovered }) => styles.textButton(pressed, hovered)}>
                            <Text style={styles.cancel}>{t('cancel')}</Text>
                          </Touchable>
                        )}
                      </View>
                      <Text style={styles.title} numberOfLines={1}>
                        {title}
                      </Text>
                      <View style={[styles.barSide, styles.barSideRight]}>
                        {confirm ? (
                          <Touchable
                            accessibilityRole="button"
                            disabled={confirm.disabled || confirm.busy}
                            onPress={confirm.onPress}
                            style={({ pressed, hovered }) => styles.textButton(pressed, hovered)}
                          >
                            {confirm.busy ? (
                              <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                              <Text style={styles.confirm(!!confirm.disabled, !!confirm.destructive)}>{confirm.label}</Text>
                            )}
                          </Touchable>
                        ) : (
                          !left && <IconButton icon={X} label={t('close')} onPress={onClose} />
                        )}
                      </View>
                    </View>
                  )}
                </View>
              </GestureDetector>
              <View style={[styles.content, fill && styles.contentFill]}>{children}</View>
            </Animated.View>
          </Animated.View>
          <ToastHost />
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
    // 居中弹窗、抽屉随键盘上移；底部弹层在面板里垫高
    paddingBottom: form === 'bottom' ? 0 : rt.insets.ime,
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
        maxHeight: rt.screen.height - rt.insets.top - theme.size.sheetTopGap,
        paddingBottom: bottomInset(rt.insets.bottom, rt.insets.ime) + theme.spacing.sm,
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
  panelFill: (form: Form) => (form === 'bottom' ? { height: rt.screen.height - rt.insets.top - theme.size.sheetTopGap } : form === 'center' ? { height: '85%' } : {}),
  // 内容裁到面板的圆角里（面板本身不裁，阴影才不被切掉）
  panelInner: (form: Form) => ({
    flexShrink: 1,
    flexGrow: 1,
    overflow: 'hidden',
    ...(form === 'center'
      ? { borderRadius: theme.radius.dialog }
      : form === 'bottom'
        ? { borderTopLeftRadius: theme.radius.sheet, borderTopRightRadius: theme.radius.sheet }
        : {}),
  }),
  grabber: {
    alignSelf: 'center',
    width: theme.size.grabberWidth,
    height: theme.size.grabberHeight,
    borderRadius: theme.radius.pill,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.text4,
  },
  bar: (form: Form) => ({
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    ...(form === 'bottom' ? { minHeight: theme.size.sheetBar, marginBottom: theme.spacing.sm } : { minHeight: theme.size.navBar }),
  }),
  // 两侧等宽，标题居中；放得下「取消」和确认文字
  barSide: {
    minWidth: theme.size.touch,
    flexBasis: theme.size.touch * 2,
    flexDirection: 'row',
  },
  barSideRight: {
    justifyContent: 'flex-end',
  },
  textButton: (pressed: boolean, hovered: boolean) => ({
    minHeight: theme.size.touch,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.block,
    opacity: pressed ? theme.opacity.pressedIcon : 1,
    backgroundColor: hovered ? theme.colors.hover : 'transparent',
  }),
  cancel: { ...theme.typography.callout, color: theme.colors.text2 },
  confirm: (disabled: boolean, destructive: boolean) => ({
    ...theme.typography.callout,
    fontWeight: '600',
    color: disabled ? theme.colors.text4 : destructive ? theme.colors.danger : theme.colors.primaryText,
  }),
  title: {
    ...theme.typography.title2,
    flex: 1,
    textAlign: 'center',
    color: theme.colors.text,
  },
  content: {
    flexShrink: 1,
  },
  contentFill: {
    flex: 1,
  },
}));
