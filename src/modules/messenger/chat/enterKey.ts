import type { TextInputProps } from 'react-native';

/** App：开了「Enter 发送」时键盘的回车键变成发送键；没开时回车换行，点输入栏的发送按钮 */
export function useEnterKey(enterSend: boolean, onSend: () => void): Partial<TextInputProps> {
  if (!enterSend) return {};
  return { submitBehavior: 'submit', returnKeyType: 'send', onSubmitEditing: onSend };
}
