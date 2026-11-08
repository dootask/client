import { createContext, useContext, type ComponentRef } from 'react';
import type { TextInput } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { ChatController } from './types';

export type InputInstance = ComponentRef<typeof TextInput>;

export interface ChatContextValue {
  controller: ChatController;
  /** 交给输入框的 ref */
  attachInput: (node: InputInstance | null) => void;
  /** 列表内容整体下移 delta */
  scrollBy: (delta: number) => void;
  /** 键盘或面板弹出的进度（0 收起 ~ 1 弹出）；只认本输入框的键盘，抽屉里的输入框弹键盘时不变 */
  inputProgress: SharedValue<number>;
}

export const ChatViewContext = createContext<ChatContextValue | null>(null);

export function useChatContextValue(): ChatContextValue {
  const value = useContext(ChatViewContext);
  if (!value) throw new Error('useChat / ChatInput 只能在 ChatView 内使用');
  return value;
}

/** 输入栏、面板按钮拿到键盘与面板的控制接口 */
export function useChat(): ChatController {
  return useChatContextValue().controller;
}

/** 输入栏上方需要在键盘或面板弹出时收起的内容（快捷菜单等）拿这个进度 */
export function useChatInputProgress(): SharedValue<number> {
  return useChatContextValue().inputProgress;
}

// 输入框与手势区域靠它关联（iOS 上 KeyboardGestureArea 的 offset 需要）
export const INPUT_NATIVE_ID = 'chat-ui-input';
