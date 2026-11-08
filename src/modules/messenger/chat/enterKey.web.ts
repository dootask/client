import type { TextInputProps } from 'react-native';

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
 * 两种设置下 Ctrl / Command+Enter 都发送。输入法选字时的回车不算
 */
export function useEnterKey(enterSend: boolean, onSend: () => void): Partial<TextInputProps> {
  return {
    onKeyPress: (event) => {
      const key = event.nativeEvent as unknown as KeyEvent;
      if (key.key !== 'Enter' || key.isComposing || key.keyCode === 229) return;
      const mod = !!key.ctrlKey || !!key.metaKey;
      if (!mod && (!enterSend || key.shiftKey)) return;
      event.preventDefault();
      onSend();
    },
  };
}
