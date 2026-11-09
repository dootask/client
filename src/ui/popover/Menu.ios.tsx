import { useMemo } from 'react';

import { Touchable } from '../Touchable';
import { resolveItems, toNativeMenu } from './menuModel';
import { NativeMenuView } from './nativeMenu';
import type { MenuProps } from './types';

/** iOS：UIMenu。点击由原生按钮接管直接弹出；context 是长按弹出的系统上下文菜单，点击仍走 onPress */
export function Menu({ items, trigger = 'press', onPress, accessibilityLabel, style, children }: MenuProps) {
  const { sections, handlers } = useMemo(() => toNativeMenu(resolveItems(items)), [items]);
  return (
    <NativeMenuView sections={sections} trigger={trigger} onAction={(event) => handlers.get(event.nativeEvent.id)?.()}>
      <Touchable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={trigger === 'context' ? onPress : undefined} style={style}>
        {children}
      </Touchable>
    </NativeMenuView>
  );
}
