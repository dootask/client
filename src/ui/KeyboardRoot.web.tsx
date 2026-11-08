import type { ReactNode } from 'react';

/** Web 上没有软键盘跟随，聊天窗口直接按窗口布局 */
export function KeyboardRoot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
