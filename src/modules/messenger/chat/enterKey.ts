import type { TextInputProps } from 'react-native';

import type { PickerKeys } from './MentionPicker';

/**
 * App：开了「Enter 发送」时键盘的回车键变成发送键；没开时回车换行，点输入栏的发送按钮。
 * 候选列表直接点选，不接按键（pickerKeys 只在 Web 用）
 */
export function useEnterKey(enterSend: boolean, onSend: () => void, _pickerKeysRef?: PickerKeys): Partial<TextInputProps> {
  if (!enterSend) return {};
  return { submitBehavior: 'submit', returnKeyType: 'send', onSubmitEditing: onSend };
}
