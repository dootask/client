import { useRef, useState } from 'react';
import type { HostInstance } from 'react-native';

import { Touchable } from '../Touchable';
import { Layer, measureAnchor, Positioned } from './Layer';
import type { Rect } from './position';
import type { PopoverProps } from './types';

/** 自定义内容的气泡：各端都自绘，点触发元素打开，点外面、按 Esc / 返回键关闭 */
export function Popover({ content, side, align, gap, accessibilityLabel, style, panelStyle, children }: PopoverProps) {
  const ref = useRef<HostInstance>(null);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <Touchable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        aria-expanded={anchor !== null}
        onPress={async () => setAnchor(await measureAnchor(ref.current))}
        style={style}
      >
        {children}
      </Touchable>
      {anchor && (
        <Layer onClose={close}>
          <Positioned anchor={anchor} side={side} align={align} gap={gap} style={panelStyle}>
            {content(close)}
          </Positioned>
        </Layer>
      )}
    </>
  );
}
