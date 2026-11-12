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
  /**
   * 自绘菜单（Web）的样式，同旧版两种下拉菜单：iview（默认）行高 32；
   * element 行高 36、描边，选中项加粗而不是打勾（消息分类下拉）
   */
  look?: 'iview' | 'element' | 'dialog';
  /** 自绘菜单的最小宽，默认 menuMinWidth（旧版消息分类下拉更宽） */
  minWidth?: number;
  /** 自绘菜单的图标放在文字右侧（旧版会话右键菜单） */
  iconEnd?: boolean;
  /**
   * 自绘菜单相对触发元素的位置；默认点击弹出在下方左对齐，右键弹出在鼠标位置。
   * 右键菜单给了这个就改为贴着触发元素弹出（旧版会话右键菜单）
   */
  placement?: { side: Side; align: Align };
  /**
   * App 上也自绘（样式同 Web），不交给系统菜单：旧 App 里这一处是 WebView 里的网页菜单（会话行菜单），照旧版还原。
   * Web 上本来就是自绘，不受影响
   */
  drawn?: boolean;
  /** 自绘菜单打开、关闭时通知（旧版打开菜单时给那一行描边） */
  onOpenChange?: (open: boolean) => void;
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
  /** 与触发元素的间距，默认 spacing.xs */
  gap?: number;
  /** 盖在默认气泡样式上（圆角、阴影、内边距照旧版各处的浮层） */
  panelStyle?: StyleProp<ViewStyle>;
  /** 触发元素的 testID */
  testID?: string;
  children: ReactNode | ((state: TouchState) => ReactNode);
}

export interface TooltipProps {
  label: string;
  side?: Side;
  /** 单个子元素，悬停在它上面时显示 */
  children: ReactNode;
}
