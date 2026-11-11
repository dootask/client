import { useRef, useState } from 'react';
import type { GestureResponderEvent, HostInstance } from 'react-native';

import { Touchable } from '../Touchable';
import { measureAnchor } from './Layer';
import { MenuLayer } from './MenuLayer';
import { type MenuEntry, resolveItems } from './menuModel';
import type { Rect } from './position';
import type { MenuProps } from './types';

/**
 * App 上的自绘菜单（Menu 的 drawn），样式同 Web 的自绘菜单：点击（press）贴着触发元素弹出，不给 placement 时在下方左对齐；
 * 长按（context）同旧版 WebView 里的做法，上下贴着触发元素、左右以手指位置为准
 */
export function DrawnMenu({ items, trigger = 'press', onPress, accessibilityLabel, hitSlop, look = 'iview', minWidth, iconEnd = false, placement, onOpenChange, style, children }: MenuProps) {
  const ref = useRef<HostInstance>(null);
  const [opened, setOpened] = useState<{ anchor: Rect; items: readonly MenuEntry[] } | null>(null);
  const setAnchor = (rect: Rect | null) => {
    const next = rect ? { anchor: rect, items: resolveItems(items) } : null;
    setOpened(next);
    onOpenChange?.(next !== null && next.items.length > 0);
  };
  const open = async () => setAnchor(await measureAnchor(ref.current));
  const openAtTouch = async (event: GestureResponderEvent) => {
    const x = event.nativeEvent.pageX;
    const rect = await measureAnchor(ref.current);
    setAnchor(rect && { ...rect, x, width: 0 });
  };
  return (
    <>
      <Touchable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        aria-expanded={opened !== null}
        onPress={trigger === 'press' ? open : onPress}
        onLongPress={trigger === 'context' ? openAtTouch : undefined}
        hitSlop={hitSlop}
        style={style}
      >
        {children}
      </Touchable>
      {opened && opened.items.length > 0 && (
        <MenuLayer
          items={opened.items}
          anchor={opened.anchor}
          side={placement?.side ?? 'bottom'}
          align={placement?.align ?? 'start'}
          atPointer={false}
          look={look}
          minWidth={minWidth}
          iconEnd={iconEnd}
          pressTint
          onClose={() => setAnchor(null)}
        />
      )}
    </>
  );
}
