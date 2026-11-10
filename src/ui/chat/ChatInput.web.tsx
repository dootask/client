import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { INPUT_NATIVE_ID, useChatContextValue, type InputInstance } from './context';

type ContentSizeEvent = Parameters<NonNullable<TextInputProps['onContentSizeChange']>>[0];

/**
 * Web 输入框：react-native-web 的多行输入框固定两行、不随内容增高（它量 scrollHeight 前不复位高度，删字后缩不回去）。
 * 这里从一行起，内容或宽度变了先把高度复位再按 scrollHeight 撑开，上限由样式的 maxHeight 定，超出框内滚动；
 * 量到的高度通过 onContentSizeChange 交给使用方
 */
export function ChatInput({ onContentSizeChange, value, ...props }: Omit<TextInputProps, 'nativeID'>) {
  const { attachInput } = useChatContextValue();
  const node = useRef<HTMLTextAreaElement | null>(null);
  const report = useRef(onContentSizeChange);
  useLayoutEffect(() => {
    report.current = onContentSizeChange;
  });

  const attach = useCallback(
    (instance: InputInstance | null) => {
      node.current = instance as unknown as HTMLTextAreaElement | null;
      attachInput(instance);
    },
    [attachInput],
  );

  const fit = useCallback(() => {
    const el = node.current;
    if (!el) return;
    el.style.height = 'auto';
    const height = el.scrollHeight;
    el.style.height = `${height}px`;
    report.current?.({ nativeEvent: { contentSize: { width: el.scrollWidth, height } } } as ContentSizeEvent);
  }, []);

  useLayoutEffect(fit, [value, fit]);

  // 宽度变了（窗口缩放、侧栏展开）换行跟着变，重新量
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  return <TextInput {...props} value={value} rows={1} ref={attach} nativeID={INPUT_NATIVE_ID} />;
}
