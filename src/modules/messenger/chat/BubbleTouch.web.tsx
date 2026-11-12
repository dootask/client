import { useRef, useState, type MouseEvent } from 'react';
import { type HostInstance, View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import type { MenuEntry } from '../../../ui/popover';
import { MenuLayer } from '../../../ui/popover/MenuLayer';
import { Touchable } from '../../../ui/Touchable';
import { setMenuBubble } from './bubbleSelect';
import type { BubbleTouchProps } from './bubbleTouchTypes';
import { rememberReaction } from './emoji';
import { MsgReactAll, MsgReactBar } from './MsgReactBar';

interface Opened {
  x: number;
  y: number;
  items: readonly MenuEntry[];
  /** 表情条展开成了全部表情（这时不显示列表） */
  allEmoji: boolean;
}

/**
 * Web：右键气泡（触屏长按同样触发 contextmenu）弹出列表菜单（同会话右键菜单的样式），上方是表情条；双击点赞；
 * 悬停不出操作条（同旧版）。菜单左上角在鼠标位置，碰到窗口边就贴边往回推，气泡再大也看得到
 */
export function BubbleTouch({ rowStyle, bubbleStyle, leading, onPress, menu, onDoubleTap, onReact, onHover, children }: BubbleTouchProps) {
  const { theme } = useUnistyles();
  const bubble = useRef<HostInstance>(null);
  const [opened, setOpened] = useState<Opened | null>(null);

  const onContextMenu = (event: MouseEvent) => {
    const node = bubble.current as unknown as HTMLElement | null;
    if (!menu || !node) return;
    event.preventDefault();
    const items = menu();
    if (items.length === 0 && !onReact) return;
    setMenuBubble(node);
    setOpened({ x: event.clientX, y: event.clientY, items, allEmoji: false });
  };

  const close = () => setOpened(null);
  const react = (symbol: string) => {
    rememberReaction(symbol);
    onReact?.(symbol);
    close();
  };

  return (
    <div style={CONTENTS} onMouseEnter={onHover} onContextMenu={onContextMenu} onDoubleClick={onDoubleTap && !onPress ? onDoubleTap : undefined}>
      <View style={rowStyle}>
        {leading !== undefined && leading}
        {/* 气泡不渲染成 <button>：里面可能还有按钮（引用、已读圈、译文），会嵌套 */}
        <Touchable ref={bubble} disabled={!onPress} onPress={onPress} style={bubbleStyle}>
          {children}
        </Touchable>
      </View>
      {opened && (
        <MenuLayer
          // 展开全部表情后尺寸变了，重新定位
          key={opened.allEmoji ? 'all' : 'menu'}
          items={opened.allEmoji ? [] : opened.items}
          anchor={{ x: opened.x, y: opened.y, width: 0, height: 0 }}
          side="bottom"
          align="start"
          atPointer
          look="iview"
          minWidth={theme.size.msgReact.menuMinWidth}
          iconEnd
          header={
            onReact &&
            (opened.allEmoji ? <MsgReactAll onPick={react} /> : <MsgReactBar onPick={react} onMore={() => setOpened({ ...opened, allEmoji: true })} />)
          }
          onClose={close}
        />
      )}
    </div>
  );
}

/** 不产生盒子的包装，只用来接鼠标事件 */
const CONTENTS = { display: 'contents' } as const;
