import { useMemo, useRef } from 'react';
import { useUnistyles } from 'react-native-unistyles';

import { Touchable } from '../Touchable';
import { toNativeMenu } from './menuModel';
import { type NativeMenuHandle, NativeMenuView } from './nativeMenu';
import type { MenuProps } from './types';

/** Android：系统弹出菜单，点击或长按时以触发元素为锚点弹出 */
export function Menu({ items, trigger = 'press', onPress, accessibilityLabel, style, children }: MenuProps) {
  const { theme, rt } = useUnistyles();
  const menu = useRef<NativeMenuHandle>(null);
  const { sections, handlers } = useMemo(() => toNativeMenu(items), [items]);
  const open = () => void menu.current?.show();
  return (
    <NativeMenuView
      ref={menu}
      sections={sections}
      dark={rt.themeName === 'dark'}
      destructiveColor={theme.colors.danger}
      onAction={(event) => handlers.get(event.nativeEvent.id)?.()}
    >
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={trigger === 'press' ? open : onPress}
        onLongPress={trigger === 'context' ? open : undefined}
        style={style}
      >
        {children}
      </Touchable>
    </NativeMenuView>
  );
}
