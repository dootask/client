import type { ReactNode } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

/** 键盘事件的根（聊天窗口的键盘跟随、下拉收键盘靠它） */
export function KeyboardRoot({ children }: { children: ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}
