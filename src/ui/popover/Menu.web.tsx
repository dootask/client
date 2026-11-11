import { useRef, useState } from 'react';
import type { HostInstance } from 'react-native';

import { Touchable } from '../Touchable';
import { measureAnchor, pointAnchor } from './Layer';
import { MenuLayer } from './MenuLayer';
import { type MenuEntry, resolveItems } from './menuModel';
import type { Rect } from './position';
import type { MenuProps } from './types';

/**
 * Web / 桌面：自绘菜单，样式同旧版的下拉菜单（docs/ui-spec.md 9.3）。点击（press）在触发元素下方弹出，
 * 右键（context）在鼠标位置弹出，给了 placement 就贴着触发元素弹出；
 * 贴边自动翻转，子菜单悬停或方向键展开；点外面、按 Esc 关闭
 */
export function Menu({ items, trigger = 'press', onPress, accessibilityLabel, hitSlop, button, look = 'iview', minWidth, iconEnd = false, placement, onOpenChange, style, children }: MenuProps) {
  const ref = useRef<HostInstance>(null);
  const [opened, setOpened] = useState<{ anchor: Rect; items: readonly MenuEntry[] } | null>(null);
  const anchor = opened?.anchor ?? null;
  const setAnchor = (rect: Rect | null) => {
    const next = rect ? { anchor: rect, items: resolveItems(items) } : null;
    setOpened(next);
    onOpenChange?.(next !== null && next.items.length > 0);
  };
  const open = async () => setAnchor(await measureAnchor(ref.current));
  const atPointer = trigger === 'context' && !placement;
  return (
    <>
      <div
        style={CONTENTS}
        onContextMenu={
          trigger === 'context'
            ? (event) => {
                event.preventDefault();
                if (atPointer) setAnchor(pointAnchor(event.clientX, event.clientY));
                else void open();
              }
            : undefined
        }
      >
        {/* 右键菜单的触发区（消息气泡）不渲染成 <button>：里面可能还有按钮（引用、已读圈、译文），会嵌套；点击动作照常 */}
        <Touchable
          ref={ref}
          accessibilityRole={trigger === 'press' || button ? 'button' : undefined}
          accessibilityLabel={accessibilityLabel}
          aria-expanded={trigger === 'press' ? anchor !== null : undefined}
          onPress={trigger === 'press' ? open : onPress}
            hitSlop={hitSlop}
          style={style}
        >
          {children}
        </Touchable>
      </div>
      {opened && opened.items.length > 0 && (
        <MenuLayer
          items={opened.items}
          anchor={opened.anchor}
          side={placement?.side ?? 'bottom'}
          align={placement?.align ?? 'start'}
          atPointer={atPointer}
          look={look}
          minWidth={minWidth}
          iconEnd={iconEnd}
          onClose={() => setAnchor(null)}
        />
      )}
    </>
  );
}

/** 不产生盒子的包装，只用来接右键事件 */
const CONTENTS = { display: 'contents' } as const;
