import type { Ref } from 'react';
import type { ViewProps } from 'react-native';

export interface KeyboardDockHandle {
  /** 面板高度（含底部安全区），0 为收起 */
  setLift: (height: number, animated: boolean) => Promise<void>;
}

export type KeyboardDockProps = ViewProps & {
  /** 键盘弹出时坞的底边可以低于键盘顶边多少（输入栏下方的安全区留白） */
  keyboardOffset: number;
  ref?: Ref<KeyboardDockHandle>;
};

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
