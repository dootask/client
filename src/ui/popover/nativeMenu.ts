import { requireNativeView } from 'expo';
import type { Ref } from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';

import type { NativeMenuItem } from './menuModel';

/** 本地 Expo 模块 modules/menu 里的原生菜单视图 */
export interface NativeMenuHandle {
  /** Android：以本视图为锚点弹出菜单。iOS 由系统处理触摸，没有这个方法 */
  show(): Promise<void>;
}

export interface NativeMenuViewProps extends ViewProps {
  sections: NativeMenuItem[][];
  /** iOS：press 盖一层系统按钮点击弹出，context 长按弹出系统上下文菜单 */
  trigger?: 'press' | 'context';
  /** Android：菜单跟随 App 内的深浅色 */
  dark?: boolean;
  /** Android：危险项的文字颜色 */
  destructiveColor?: string;
  /** 选中了某一项（不叫 onSelect：和 RN 内置的冒泡事件 topSelect 重名，Fabric 会报错） */
  onAction: (event: NativeSyntheticEvent<{ id: string }>) => void;
  ref?: Ref<NativeMenuHandle>;
}

export const NativeMenuView = requireNativeView<NativeMenuViewProps>('DooTaskMenu');
