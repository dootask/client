import type { TextInputProps } from 'react-native';

import type { PickerKeys } from './MentionPicker';

interface KeyEvent {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
}

/**
 * Web、桌面：开了「Enter 发送」时 Enter 发送、Shift+Enter 换行；没开时 Enter 换行。
 * 两种设置下 Ctrl / Command+Enter 都发送。输入法选字时的按键不算。
 * 弹出候选时上下键、Enter、Tab、Esc 先交给候选列表
 */
export function useEnterKey(enterSend: boolean, onSend: () => void, pickerKeysRef?: PickerKeys): Partial<TextInputProps> {
  return {
    onKeyPress: (event) => {
      const key = event.nativeEvent as unknown as KeyEvent;
      if (key.isComposing || key.keyCode === 229) return;
      const mod = !!key.ctrlKey || !!key.metaKey;
      if (!mod && !key.shiftKey && pickerKeysRef?.current?.(key.key)) {
        event.preventDefault();
        return;
      }
      if (key.key !== 'Enter') return;
      if (!mod && (!enterSend || key.shiftKey)) return;
      event.preventDefault();
      onSend();
    },
  };
}
