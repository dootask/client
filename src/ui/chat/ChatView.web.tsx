import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { ChatViewContext, type ChatContextValue, type InputInstance } from './context';
import type { ChatController, ChatViewHandle, ChatViewProps } from './types';
import { useNewMessages } from './useNewMessages';
import { WebMessageList, type WebMessageListHandle } from './WebMessageList';

/**
 * 会话主视图（Web / 桌面）：导航栏、消息列表、输入栏、面板自上而下排开。
 * 没有软键盘跟随，面板直接排在输入栏下方；对外接口与原生版（ChatView.tsx）相同
 */
function ChatViewInner<T>(props: ChatViewProps<T>, ref: React.Ref<ChatViewHandle>) {
  const { messages, header, composer, bottomColor, accessory, panels, panelHeight = 280, panelHeights, renderScrollToBottom, floating, hasNewer, onJumpToLatest, listHidden = false } = props;
  const safeBottom = useSafeAreaInsets().bottom;
  const listRef = useRef<WebMessageListHandle>(null);
  const inputRef = useRef<InputInstance | null>(null);

  const [activePanel, setActivePanel] = useState<string | null>(null);
  const inputProgress = useSharedValue(0);
  useEffect(() => {
    inputProgress.set(activePanel ? 1 : 0);
  }, [activePanel, inputProgress]);

  const controller = useMemo<ChatController>(() => {
    const focusInput = () => inputRef.current?.focus();
    return {
      activePanel,
      keyboardShown: false,
      togglePanel: (name) => {
        if (activePanel === name) {
          setActivePanel(null);
          focusInput();
        } else {
          setActivePanel(name);
        }
      },
      closePanel: () => setActivePanel(null),
      focusInput,
      dismiss: () => {
        setActivePanel(null);
        return activePanel !== null;
      },
    };
  }, [activePanel]);

  const attachInput = useCallback((node: InputInstance | null) => {
    inputRef.current = node;
  }, []);
  const scrollBy = useCallback((delta: number) => listRef.current?.scrollBy(delta), []);
  const context = useMemo<ChatContextValue>(() => ({ controller, attachInput, scrollBy, inputProgress }), [controller, attachInput, scrollBy, inputProgress]);

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

  // 隐藏期间列表照常布局、定位，只是看不见；显示时淡入
  const listOpacity = useSharedValue(listHidden ? 0 : 1);
  useEffect(() => {
    listOpacity.set(listHidden ? 0 : withTiming(1, { duration: 150 }));
  }, [listHidden, listOpacity]);
  const listStyle = useAnimatedStyle(() => ({ opacity: listOpacity.get() }));

  const empty = messages.length === 0;
  const center = listHidden || (empty && props.loadingEarlier) ? props.loadingIndicator : empty ? props.emptyContent : null;
  const panelShown = activePanel !== null && panels?.[activePanel] !== undefined;

  return (
    <ChatViewContext.Provider value={context}>
      <View style={styles.root}>
        {header}
        <View style={styles.body}>
          {/* 动画样式与 unistyles 样式分两层放，Web 上同一个视图混用会互相覆盖 */}
          <Animated.View style={[FILL, listStyle]} pointerEvents={listHidden ? 'none' : 'auto'}>
            <WebMessageList
              ref={listRef}
              messages={messages}
              currentUserId={props.currentUserId}
              renderMessage={props.renderMessage}
              renderDay={props.renderDay}
              highlightColor={props.highlightColor}
              loadingIndicator={props.loadingIndicator}
              hasEarlier={props.hasEarlier}
              loadingEarlier={props.loadingEarlier}
              onLoadEarlier={props.onLoadEarlier}
              hasNewer={hasNewer}
              loadingNewer={props.loadingNewer}
              onLoadNewer={props.onLoadNewer}
              onAtBottomChange={onAtBottomChange}
              onVisibleChange={props.onVisibleChange}
            />
          </Animated.View>
          {center != null && <View style={styles.center} pointerEvents="none">{center}</View>}
          <View style={styles.floating} pointerEvents="box-none">
            {floating}
            {showScrollToBottom && <Pressable onPress={() => void scrollToBottom()}>{renderScrollToBottom({ newCount })}</Pressable>}
          </View>
          {accessory != null && <View style={styles.accessory}>{accessory}</View>}
        </View>
        <View style={{ backgroundColor: bottomColor, paddingBottom: safeBottom }}>
          {composer}
          {panelShown && <View style={{ height: panelHeights?.[activePanel] ?? panelHeight }}>{panels[activePanel]}</View>}
        </View>
      </View>
    </ChatViewContext.Provider>
  );
}

export const ChatView = forwardRef(ChatViewInner) as <T>(
  props: ChatViewProps<T> & { ref?: React.Ref<ChatViewHandle> },
) => React.ReactElement;

const FILL = { flex: 1 };

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, overflow: 'hidden' },
  body: { flex: 1, minHeight: 0 },
  floating: { position: 'absolute', right: theme.spacing.md, bottom: theme.spacing.md, gap: theme.spacing.md },
  accessory: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
}));
