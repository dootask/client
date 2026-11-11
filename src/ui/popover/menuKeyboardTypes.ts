import type { HostInstance } from 'react-native';

export interface MenuKeyboardOptions {
  /** 按键（KeyboardEvent.key）；返回 true 表示处理了，阻止默认行为 */
  onKey: (key: string) => boolean;
  /** 当前高亮的行，焦点跟过去 */
  focusRow: () => HostInstance | null;
  /** 高亮的行变了就换焦点 */
  focusKey: string;
}
