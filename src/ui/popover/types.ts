import type { ReactNode } from 'react';
import type { Insets, StyleProp, ViewStyle } from 'react-native';

import type { TouchState } from '../Touchable';
import type { MenuEntry } from './menuModel';
import type { Align, Side } from './position';

export interface MenuProps {
  /** 菜单项；给函数时打开菜单才计算（列表里每行都有菜单时，不必每次渲染都算一遍） */
  items: readonly MenuEntry[] | (() => readonly MenuEntry[]);
  /**
   * press：点击弹出（下拉菜单，默认）；
   * context：右键菜单，Web 上点右键、App 上长按弹出，点击仍走 onPress
   */
  trigger?: 'press' | 'context';
  /** trigger 为 context 时，普通点击做什么 */
  onPress?: () => void;
  /** trigger 为 context 时触发元素本身也是按钮（如发送按钮）；默认不是，消息气泡里还有别的按钮，不能嵌套 */
  button?: boolean;
  accessibilityLabel?: string;
  /** 触发元素比触摸区小时（输入栏里的图标按钮）放大触摸区 */
  hitSlop?: Insets;
  style?: StyleProp<ViewStyle> | ((state: TouchState) => StyleProp<ViewStyle>);
  /** 触发元素，只负责外观，点击由 Menu 处理 */
  children: ReactNode | ((state: TouchState) => ReactNode);
}

export interface ConfirmProps {
  title: string;
  message?: string;
  /** 确认按钮文字，默认「确定」 */
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle> | ((state: TouchState) => StyleProp<ViewStyle>);
  children: ReactNode | ((state: TouchState) => ReactNode);
}

export interface PopoverProps {
  /** 气泡内容；close 用来在内容里关闭气泡 */
  content: (close: () => void) => ReactNode;
  side?: Side;
  align?: Align;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle> | ((state: TouchState) => StyleProp<ViewStyle>);
  children: ReactNode | ((state: TouchState) => ReactNode);
}

export interface TooltipProps {
  label: string;
  side?: Side;
  /** 单个子元素，悬停在它上面时显示 */
  children: ReactNode;
}
