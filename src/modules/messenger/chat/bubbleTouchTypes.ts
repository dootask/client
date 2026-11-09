import type { ComponentRef, ReactNode } from 'react';
import type { StyleProp, View, ViewStyle } from 'react-native';

import type { MenuEntry } from '../../../ui/popover';

export type RowRef = ComponentRef<typeof View>;

/**
 * 气泡的点按、长按、滑动、悬停（App 与 Web 各一份实现）。
 * 整行（含头像列）在这里画，App 长按时量整行的位置浮起重画
 */
export interface BubbleTouchProps {
  own: boolean;
  rowStyle: StyleProp<ViewStyle>;
  bubbleStyle: StyleProp<ViewStyle>;
  /** 对方消息左侧的头像列；undefined 为没有这一列 */
  leading?: ReactNode;
  onPress?: () => void;
  /** 菜单项（打开时才计算）。App 长按弹出浮起菜单（交给 onLongPress），Web 右键和悬停条「更多」弹出 */
  menu?: () => readonly MenuEntry[];
  /** App：长按，参数是整行（量位置用） */
  onLongPress?: (row: RowRef) => void;
  /** App：气泡右滑回复；Web：悬停条的回复按钮 */
  onReply?: () => void;
  /** 双击点赞；有 onPress（点开图片、文件）时单击要立刻响应，App 上不支持双击 */
  onDoubleTap?: () => void;
  /** Web：悬停条的表情按钮 */
  onReact?: (symbol: string) => void;
  /** Web：鼠标移上来（预取菜单要用的状态，如收藏） */
  onHover?: () => void;
  children: ReactNode;
}
