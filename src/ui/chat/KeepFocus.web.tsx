import { useEffect, useRef, type ComponentRef } from 'react';
import { View, type ViewProps } from 'react-native';

const keep = (event: MouseEvent) => event.preventDefault();

/**
 * 点里面的东西不抢输入框的焦点：按下时阻止浏览器默认的移焦点。
 * 用在输入栏上方的快捷表情、表情面板，点了以后还能接着打字
 */
export function KeepFocus(props: ViewProps) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    node?.addEventListener('mousedown', keep);
    return () => node?.removeEventListener('mousedown', keep);
  }, []);
  return <View ref={ref} {...props} />;
}
