import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { TouchState } from '../Touchable';
import type { MenuEntry } from './menuModel';
import type { Align, Side } from './position';

export interface MenuProps {
  items: readonly MenuEntry[];
  /**
   * press：点击弹出（下拉菜单，默认）；
   * context：右键菜单，Web 上点右键、App 上长按弹出，点击仍走 onPress
   */
  trigger?: 'press' | 'context';
  /** trigger 为 context 时，普通点击做什么 */
  onPress?: () => void;
  accessibilityLabel?: string;
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
