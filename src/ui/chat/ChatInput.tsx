import { TextInput, type TextInputProps } from 'react-native';

import { INPUT_NATIVE_ID, useChatContextValue } from './context';

/** 输入框：外观由使用方定，焦点与键盘联动由 ChatView 接管 */
export function ChatInput(props: Omit<TextInputProps, 'nativeID'>) {
  const { attachInput } = useChatContextValue();
  return <TextInput {...props} ref={attachInput} nativeID={INPUT_NATIVE_ID} />;
}
