import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface DropZoneProps {
  /** 拖进来的文件（不含文件夹），至少一个 */
  onFiles: (files: File[]) => void;
  /** 拖进来的东西里有文件夹（文件夹被忽略），调用方据此提示 */
  onFolders?: () => void;
  /** 拖着文件悬在区域上方时，蒙层上的提示文字 */
  label: string;
  /** 为 true 时不接收拖放（如没有发送权限） */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}
