import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, GestureHandlerRootView, useTapGesture } from 'react-native-gesture-handler';
import { KeyboardGestureArea } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lightTheme } from '../theme/tokens';
import { ChatViewContext, INPUT_NATIVE_ID, type ChatContextValue } from './context';
import { KeyboardDock } from './KeyboardDock';
import type { KeyboardDockHandle } from './keyboardDockTypes';
import { MessageList, type MessageListHandle } from './MessageList';
import type { ChatViewHandle, ChatViewProps } from './types';
import { useBottomInset } from './useBottomInset';
import { useNewMessages } from './useNewMessages';

/** 页面打开后多久预先挂好面板（避开进场动画） */
const PANEL_PRELOAD_DELAY = 1000;

/**
 * 会话主视图。布局（自上而下）：导航栏（浮在最上层）、消息列表、输入栏；面板贴底，藏在屏幕外。
 *
 * 键盘或面板弹出时，列表与输入栏作为一个整体上移，列表内容区不因键盘改变尺寸，所以弹键盘不会造成列表重排。
 * - iOS：整体放在原生底坞（KeyboardDock）里，由 UIKit 按 keyboardLayoutGuide 与键盘同一个动画托起，面板贴在坞下方一起走
 * - Android：transform 逐帧跟随底部占用，面板单独从底部滑出
 */
function ChatViewInner<T>(props: ChatViewProps<T>, ref: React.Ref<ChatViewHandle>) {
  const {
    messages, header, composer, bottomColor, accessory, panels, panelHeight = 280, panelHeights, keyboardDragOffset, renderScrollToBottom, floating, scrollLock, hasNewer, onJumpToLatest, listHidden = false,
  } = props;
  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom;
  const heightOf = useCallback((name: string) => panelHeights?.[name] ?? panelHeight, [panelHeights, panelHeight]);
  // 面板容器按最高的面板摆放，露出多少由 panel 决定；各面板内容只占自己的高度
  const panelTotal = Math.max(panelHeight, ...Object.values(panelHeights ?? {})) + safeBottom;
  const dockRef = useRef<KeyboardDockHandle>(null);
  const liftDock = useCallback((height: number, animated: boolean) => dockRef.current?.setLift(height, animated).catch(() => {}) ?? Promise.resolve(), []);
  const { keyboard, keyboardProgress, keyboardDragging, panel, shownPanel, settledBottom, attachInput, controller } = useBottomInset(
    useCallback((name: string) => heightOf(name) + safeBottom, [heightOf, safeBottom]),
    liftDock,
  );
  // 键盘或面板弹出的进度（0 收起 ~ 1 弹出）：键盘与面板交接时面板先就位，进度保持 1，不在中途回落
  const panelMin = Math.min(panelHeight, ...Object.values(panelHeights ?? {})) + safeBottom;
  const inputProgress = useDerivedValue(() => Math.max(keyboardProgress.value, Math.min(1, panel.value / panelMin)));
  const scrollLocked = useDerivedValue(() => keyboardDragging.value || !!scrollLock?.value);
  const listRef = useRef<MessageListHandle>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, Math.max(keyboard.value, panel.value) - safeBottom) }],
  }));
  // 隐藏期间列表照常布局、滚动定位，只是看不见；显示时淡入
  const listOpacity = useSharedValue(listHidden ? 0 : 1);
  useEffect(() => {
    listOpacity.value = listHidden ? 0 : withTiming(1, { duration: 150 });
  }, [listHidden, listOpacity]);
  const listStyle = useAnimatedStyle(() => ({ opacity: listOpacity.value }));
  // 居中的提示按露出的部分摆：键盘、面板弹起时整体上移，顶端这一截藏在导航栏后面
  const centerStyle = useAnimatedStyle(() => ({ paddingTop: Math.max(0, Math.max(keyboard.value, panel.value) - safeBottom) }));
  // 没有消息时加载提示、空状态居中显示（列表里的加载提示会贴在倒置列表的起点，即最底部）
  const empty = messages.length === 0;
  const center = listHidden || (empty && props.loadingEarlier) ? props.loadingIndicator : empty ? props.emptyContent : null;
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelTotal - panel.value }],
  }));
  // iOS 面板贴在坞里：收起后上沿仍留在安全区那一条里，键盘弹着时在半透明的键盘后面。
  // 这两种时候内容在 UI 线程上直接藏起来（随键盘进度淡出），不等 React 撤掉面板
  const panelContentStyle = useAnimatedStyle(() => ({
    opacity: panel.value <= safeBottom ? 0 : 1 - keyboardProgress.value,
  }));

  const { onAtBottomChange, newCount, away } = useNewMessages(messages, hasNewer);
  const showScrollToBottom = !!renderScrollToBottom && away;

  const scrollToBottom = useCallback(async () => {
    if (hasNewer && onJumpToLatest) {
      await onJumpToLatest();
      listRef.current?.scrollToBottom(false);
    } else {
      listRef.current?.scrollToBottom();
    }
  }, [hasNewer, onJumpToLatest]);

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => void scrollToBottom(),
    dismissInput: () => controller.dismiss(),
    scrollToMessage: (id, options) => listRef.current?.scrollToMessage(id, options) ?? Promise.resolve(),
  }), [scrollToBottom, controller]);

  // 系统返回键先收起面板（键盘由系统自己收）
  useEffect(() => {
    if (!controller.activePanel) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => controller.dismiss());
    return () => sub.remove();
  }, [controller]);

  const tap = useTapGesture({ runOnJS: true, onActivate: () => controller.dismiss() });

  const scrollBy = useCallback((delta: number) => listRef.current?.scrollBy(delta), []);
  const context = useMemo<ChatContextValue>(() => ({ controller, attachInput, scrollBy, inputProgress }), [controller, attachInput, scrollBy, inputProgress]);

  const onHeaderLayout = useCallback((e: LayoutChangeEvent) => setHeaderHeight(e.nativeEvent.layout.height), []);

  // 面板挂上后一直留着（不显示的藏起来），打开时不用现挂：现挂要在弹出动画途中一次渲染整屏内容，会掉帧。
  // 页面打开稍后预先挂好全部面板，第一次打开也不卡
  const panelNames = Object.keys(panels ?? {}).join(',');
  const [mountedPanels, setMountedPanels] = useState<string[]>([]);
  if (shownPanel && !mountedPanels.includes(shownPanel)) setMountedPanels([...mountedPanels, shownPanel]);
  useEffect(() => {
    const timer = setTimeout(() => setMountedPanels(panelNames ? panelNames.split(',') : []), PANEL_PRELOAD_DELAY);
    return () => clearTimeout(timer);
  }, [panelNames]);

  const body = (
    <>
      <View style={styles.fill}>
        <GestureDetector gesture={tap}>
          <Animated.View style={[styles.fill, listStyle]} pointerEvents={listHidden ? 'none' : 'auto'} collapsable={false}>
            <MessageList
              ref={listRef}
              messages={messages}
              currentUserId={props.currentUserId}
              renderMessage={props.renderMessage}
              renderDay={props.renderDay}
              highlightColor={props.highlightColor}
              loadingIndicator={props.loadingIndicator}
              topInset={Math.max(0, settledBottom - safeBottom)}
              hasEarlier={props.hasEarlier}
              loadingEarlier={props.loadingEarlier}
              onLoadEarlier={props.onLoadEarlier}
              hasNewer={hasNewer}
              loadingNewer={props.loadingNewer}
              onLoadNewer={props.onLoadNewer}
              scrollLocked={scrollLocked}
              onAtBottomChange={onAtBottomChange}
              onVisibleChange={props.onVisibleChange}
            />
          </Animated.View>
        </GestureDetector>
        {center != null && <Animated.View style={[styles.center, centerStyle]} pointerEvents="none">{center}</Animated.View>}
        <View style={styles.floating} pointerEvents="box-none">
          {floating}
          {showScrollToBottom && (
            <Pressable onPress={() => void scrollToBottom()}>
              {renderScrollToBottom({ newCount })}
            </Pressable>
          )}
        </View>
        {accessory != null && <View style={styles.accessory}>{accessory}</View>}
      </View>
      <View style={{ paddingBottom: safeBottom, backgroundColor: bottomColor }}>
        {composer}
      </View>
    </>
  );
  // iOS 面板贴在坞内输入栏下方（盖住输入栏的安全区留白），随坞托起露出；Android 从底部平移滑出
  const panelArea = (
    <Animated.View
      pointerEvents={shownPanel ? 'auto' : 'none'}
      style={[styles.panel, { height: panelTotal, paddingBottom: safeBottom, backgroundColor: bottomColor }, KeyboardDock ? { bottom: safeBottom - panelTotal } : panelStyle]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, KeyboardDock && panelContentStyle]} pointerEvents="box-none">
        {mountedPanels.map((name) => {
          const shown = name === shownPanel;
          return (
            <View
              key={name}
              pointerEvents={shown ? 'auto' : 'none'}
              importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
              accessibilityElementsHidden={!shown}
              style={[styles.panelContent, { height: heightOf(name), opacity: shown ? 1 : 0 }]}
            >
              {panels?.[name]}
            </View>
          );
        })}
      </Animated.View>
    </Animated.View>
  );

  return (
    <ChatViewContext.Provider value={context}>
      {/* 下拉收键盘的手势区必须包在 GestureHandlerRootView 外面：列表是 RNGH 的滚动视图，
          它一激活，RNGH 根视图就把后续触摸事件截走直接交给它，根视图里面的原生视图再也收不到 move，键盘就不跟手 */}
      <KeyboardGestureArea
        style={styles.root}
        interpolator="ios"
        offset={keyboardDragOffset}
        textInputNativeID={INPUT_NATIVE_ID}
      >
        <GestureHandlerRootView style={styles.fill}>
          {KeyboardDock ? (
            <KeyboardDock ref={dockRef} keyboardOffset={safeBottom} style={[styles.body, { top: headerHeight }]}>
              {body}
              {panelArea}
            </KeyboardDock>
          ) : (
            <>
              <Animated.View style={[styles.body, { top: headerHeight }, bodyStyle]}>{body}</Animated.View>
              {panelArea}
            </>
          )}
          {header != null && (
            <View onLayout={onHeaderLayout} style={styles.header}>
              {header}
            </View>
          )}
        </GestureHandlerRootView>
      </KeyboardGestureArea>
    </ChatViewContext.Provider>
  );
}

export const ChatView = forwardRef(ChatViewInner) as <T>(
  props: ChatViewProps<T> & { ref?: React.Ref<ChatViewHandle> },
) => React.ReactElement;

// GestureHandlerRootView、KeyboardGestureArea 不经过 unistyles，直接取令牌（间距两套主题相同）
const { spacing } = lightTheme;

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1 },
  body: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  header: { position: 'absolute', left: 0, right: 0, top: 0 },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  panelContent: { position: 'absolute', left: 0, right: 0, top: 0 },
  floating: { position: 'absolute', right: spacing.md, bottom: spacing.md, gap: spacing.md },
  accessory: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
