import { useCallback, useMemo, useRef, useState } from 'react';
import { findNodeHandle } from 'react-native';
import { KeyboardController, useKeyboardHandler } from 'react-native-keyboard-controller';
import { Easing, runOnJS, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import type { InputInstance } from './context';
import type { ChatController } from './types';

/**
 * 底部高度：键盘与面板共用。
 *
 * 底部占用 = max(键盘高度, 面板高度)，输入栏和列表都只看这一个值。面板有自己的高度，不跟键盘一样高。
 * - 键盘 → 面板：面板直接就位（被键盘盖着），再收键盘；键盘下落时整体跟着落到面板高度。
 *   面板比键盘高时从键盘高度动画升到面板高度。
 *   不在键盘 onStart 里按标志切换：JS 写的共享值可能晚于键盘事件到达 UI 线程，标志读不到时面板就不出现。
 * - 面板 → 键盘：键盘升起期间面板保持，键盘到位（onEnd）后面板归零；键盘比面板矮时面板动画收到键盘高度。
 * - 无键盘时开关面板、面板之间切换：面板高度做动画。
 * 其余切换都在 UI 线程的键盘事件里完成，不依赖 React 提交与键盘事件凑在同一帧。
 *
 * 只认本输入框弹出的键盘：页面上的抽屉（投票、AI 生成等）里的输入框弹键盘时，消息区与输入栏不动。
 * 键盘弹出时按事件的 target（聚焦输入框的视图 tag）判定归属，收起时沿用弹出时的判定。
 *
 * iOS 上位移由原生底坞（KeyboardDock）摆：键盘部分 UIKit 自己跟，面板部分经 liftDock 同步给它；
 * 这里的共享值只供进度、留白等 JS 侧用途。
 */

const PANEL_TIMING = { duration: 250, easing: Easing.bezier(0.2, 0.8, 0.2, 1) };

/**
 * heightOf：各面板的总高度（含底部安全区）
 * liftDock：把面板高度同步给 iOS 底坞（Android 无坞，直接完成）
 */
export function useBottomInset(heightOf: (name: string) => number, liftDock: (height: number, animated: boolean) => Promise<void>) {
  const keyboard = useSharedValue(0);
  // 本输入框弹出的键盘的进度（0 收起 ~ 1 弹出），供输入栏上方需要跟着键盘收起的内容用
  const keyboardProgress = useSharedValue(0);
  const panel = useSharedValue(0);
  // 键盘目标状态是否为弹出（动画开始时即更新）
  const keyboardShown = useSharedValue(false);
  // 手指正拖着键盘（下拉收键盘）。此期间列表锁住滚动，内容只随整体位移跟手：
  // 列表滚动按手指在列表自身坐标里的位移计算，而列表又在随键盘平移，两者不在同一时刻生效，
  // 掉帧时内容会先冲过手指再被拉回（实测单帧回跳 78dp）
  const keyboardDragging = useSharedValue(false);
  const inputRef = useRef<InputInstance>(null);
  // 本输入框的视图 tag，与键盘事件的 target 对比
  const inputTag = useSharedValue(-1);
  // 当前键盘是否由本输入框弹出
  const owned = useSharedValue(false);
  // 要显示面板：键盘弹着时点面板，收键盘前还会来一次同高度的弹出事件（撤掉 keyboard-controller 的隐形附件视图引起），
  // 键盘弹着且要显示面板时的弹出事件都忽略，不当成键盘弹出撤面板。打开面板时写入，收键盘在其后（等底坞托起），写入总能先到；
  // 键盘真正弹出（从收起状态）时清除
  const panelWanted = useSharedValue(false);
  // activePanel 是目标状态（按钮图标立即跟着变）；shownPanel 是正在显示的面板，切到键盘时等键盘到位才撤
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [shownPanel, setShownPanel] = useState<string | null>(null);
  // keyboardShown 的 React 状态，供输入栏上方要随键盘出现、消失的内容用
  const [keyboardUp, setKeyboardUp] = useState(false);
  // 停稳后的底部占用，供不需要逐帧跟随的布局使用（列表最顶端的留白）
  const [settledBottom, setSettledBottom] = useState(0);

  const onPanelClosed = useCallback(() => {
    setShownPanel(null);
    setSettledBottom(0);
  }, []);

  const dropDock = useCallback((animated: boolean) => void liftDock(0, animated), [liftDock]);

  useKeyboardHandler({
    onStart: (e) => {
      'worklet';
      if (e.height > 0) owned.value = e.target === inputTag.value;
      if (!owned.value) return;
      if (e.height > 0) {
        if (keyboardShown.value && panelWanted.value) return;
        panelWanted.value = false;
        runOnJS(setActivePanel)(null);
      }
      keyboardShown.value = e.height > 0;
      runOnJS(setKeyboardUp)(e.height > 0);
    },
    onMove: (e) => {
      'worklet';
      if (!owned.value) return;
      keyboard.value = e.height;
      keyboardProgress.value = e.progress;
    },
    onInteractive: (e) => {
      'worklet';
      if (!owned.value) return;
      keyboardDragging.value = true;
      keyboard.value = e.height;
      keyboardProgress.value = e.progress;
    },
    onEnd: (e) => {
      'worklet';
      if (!owned.value) return;
      if (e.height > 0 && panelWanted.value) return;
      keyboardDragging.value = false;
      keyboard.value = e.height;
      keyboardProgress.value = e.progress;
      if (e.height > 0) {
        if (panel.value > 0) {
          const animated = panel.value > e.height;
          panel.value = animated ? withTiming(0, PANEL_TIMING) : 0;
          runOnJS(dropDock)(animated);
        }
        runOnJS(setSettledBottom)(e.height);
        runOnJS(setShownPanel)(null);
      } else if (panel.value === 0) {
        runOnJS(setSettledBottom)(0);
      }
    },
  }, [dropDock]);

  /** 输入框的 ref：同时记下视图 tag */
  const attachInput = useCallback((node: InputInstance | null) => {
    inputRef.current = node;
    inputTag.set((node && findNodeHandle(node)) ?? -1);
  }, [inputTag]);

  const closePanel = useCallback(() => {
    panelWanted.set(false);
    setActivePanel(null);
    void liftDock(0, true);
    panel.set(withTiming(0, PANEL_TIMING, (finished) => {
      if (finished) runOnJS(onPanelClosed)();
    }));
  }, [panel, panelWanted, onPanelClosed, liftDock]);

  const focusInput = useCallback(() => {
    const input = inputRef.current;
    // 系统返回键收起键盘后输入框仍是聚焦状态，再 focus 不会弹出键盘，先失焦
    if (input?.isFocused() && !keyboardShown.get()) input.blur();
    input?.focus();
  }, [keyboardShown]);

  const togglePanel = useCallback((name: string) => {
    if (activePanel === name) {
      focusInput();
      return;
    }
    const panelHeight = heightOf(name);
    panelWanted.set(true);
    setActivePanel(name);
    setShownPanel(name);
    setSettledBottom(panelHeight);
    if (keyboardShown.get()) {
      const current = keyboard.get();
      panel.set(panelHeight > current ? withSequence(withTiming(current, { duration: 0 }), withTiming(panelHeight, PANEL_TIMING)) : panelHeight);
      // 底坞先托到面板高度再收键盘，否则坞会先随键盘落下再升回来
      void liftDock(panelHeight, panelHeight > current).then(() => KeyboardController.dismiss());
    } else {
      void liftDock(panelHeight, true);
      panel.set(withTiming(panelHeight, PANEL_TIMING));
    }
  }, [activePanel, heightOf, focusInput, keyboardShown, keyboard, panel, panelWanted, liftDock]);

  /** 键盘与面板一起收起 */
  const dismiss = useCallback(() => {
    const keyboardUp = keyboardShown.get();
    const panelUp = !!activePanel || !!shownPanel;
    if (keyboardUp) void KeyboardController.dismiss();
    if (panelUp) closePanel();
    return keyboardUp || panelUp;
  }, [keyboardShown, activePanel, shownPanel, closePanel]);

  const controller = useMemo<ChatController>(
    () => ({ activePanel, keyboardShown: keyboardUp, togglePanel, closePanel, focusInput, dismiss }),
    [activePanel, keyboardUp, togglePanel, closePanel, focusInput, dismiss],
  );

  return { keyboard, keyboardProgress, keyboardDragging, panel, shownPanel, settledBottom, attachInput, controller };
}
