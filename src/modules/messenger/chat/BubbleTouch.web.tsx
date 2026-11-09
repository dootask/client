import { Ellipsis, Reply, SmilePlus } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Icon, type LucideIcon } from '../../../ui/Icon';
import { Menu, type MenuEntry, Popover, Tooltip } from '../../../ui/popover';
import { Touchable } from '../../../ui/Touchable';
import type { BubbleTouchProps } from './bubbleTouchTypes';
import { REACTIONS } from './emoji';

/**
 * Web：右键出菜单，双击点赞；鼠标移到这一行时气泡旁出现操作条（回复、回应、更多）。
 * 操作条第一次悬停才挂上，之后只切换显隐：从它打开的菜单、表情弹层在它隐藏后还要留着。
 * 悬停用原生 mouseenter / mouseleave：React 的合成事件把弹出菜单（portal）算作这一行的子节点，
 * 菜单关闭、弹层盖上来时收不到离开，操作条会一直挂着
 */
export function BubbleTouch({ own, rowStyle, bubbleStyle, leading, onPress, menu, onReply, onDoubleTap, onReact, onHover, children }: BubbleTouchProps) {
  const [armed, setArmed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasBar = !!(onReply || onReact || menu);
  return (
    <div
      style={CONTENTS}
      ref={(el) => {
        if (!el) return;
        const enter = () => {
          setArmed(true);
          setHovered(true);
          onHover?.();
        };
        const leave = () => setHovered(false);
        el.addEventListener('mouseenter', enter);
        el.addEventListener('mouseleave', leave);
        return () => {
          el.removeEventListener('mouseenter', enter);
          el.removeEventListener('mouseleave', leave);
        };
      }}
      onDoubleClick={onDoubleTap && !onPress ? onDoubleTap : undefined}
    >
      <View style={rowStyle}>
        {leading !== undefined && leading}
        <View style={styles.anchor}>
          {menu ? (
            <Menu items={menu} trigger="context" onPress={onPress} style={bubbleStyle}>
              {children}
            </Menu>
          ) : (
            <Touchable disabled={!onPress} onPress={onPress} style={bubbleStyle}>
              {children}
            </Touchable>
          )}
          {hasBar && armed && (
            <View style={[styles.bar(own), !hovered && styles.hidden]}>
              {onReply && <ReplyButton onReply={onReply} />}
              {onReact && <ReactButton onReact={onReact} />}
              {menu && <MoreButton menu={menu} />}
            </View>
          )}
        </View>
      </View>
    </div>
  );
}

/** 不产生盒子的包装，只用来接鼠标事件 */
const CONTENTS = { display: 'contents' } as const;

function BarIcon({ icon }: { icon: LucideIcon }) {
  const { theme } = useUnistyles();
  return <Icon icon={icon} color={theme.colors.text2} size={theme.size.iconSmall} />;
}

function ReplyButton({ onReply }: { onReply: () => void }) {
  const label = useT()('messenger:chat.reply');
  return (
    <Tooltip label={label}>
      <Touchable accessibilityRole="button" accessibilityLabel={label} onPress={onReply} style={({ pressed, hovered }) => styles.button(pressed, hovered)}>
        <BarIcon icon={Reply} />
      </Touchable>
    </Tooltip>
  );
}

function MoreButton({ menu }: { menu: () => readonly MenuEntry[] }) {
  const label = useT()('messenger:action.more');
  return (
    <Tooltip label={label}>
      <Menu items={menu} accessibilityLabel={label} style={({ pressed, hovered }) => styles.button(pressed, hovered)}>
        <BarIcon icon={Ellipsis} />
      </Menu>
    </Tooltip>
  );
}

function ReactButton({ onReact }: { onReact: (symbol: string) => void }) {
  const label = useT()('messenger:chat.react');
  return (
    <Tooltip label={label}>
      <Popover
        side="top"
        accessibilityLabel={label}
        style={({ pressed, hovered }) => styles.button(pressed, hovered)}
        content={(close) => (
          <View style={styles.emojis}>
            {REACTIONS.map((symbol) => (
              <EmojiButton
                key={symbol}
                symbol={symbol}
                onPress={() => {
                  close();
                  onReact(symbol);
                }}
              />
            ))}
          </View>
        )}
      >
        <BarIcon icon={SmilePlus} />
      </Popover>
    </Tooltip>
  );
}

function EmojiButton({ symbol, onPress }: { symbol: string; onPress: () => void }) {
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={symbol} onPress={onPress} style={({ pressed, hovered }) => styles.emojiCell(pressed, hovered)}>
      <Text style={styles.emoji} allowFontScaling={false}>{symbol}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  // 操作条相对气泡定位：放在气泡外侧（对方消息在右边，自己的在左边），顶部对齐
  anchor: { flexShrink: 1, minWidth: 0 },
  bar: (own: boolean) => ({
    position: 'absolute',
    top: 0,
    ...(own ? { right: '100%', marginRight: theme.spacing.xs } : { left: '100%', marginLeft: theme.spacing.xs }),
    flexDirection: 'row',
    padding: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.popover,
  }),
  hidden: { opacity: 0, pointerEvents: 'none' },
  button: (pressed: boolean, hovered: boolean) => ({
    width: theme.size.hoverAction,
    height: theme.size.hoverAction,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: pressed ? theme.opacity.pressedIcon : 1,
    backgroundColor: hovered ? theme.colors.hover : 'transparent',
  }),
  emojis: { flexDirection: 'row', padding: theme.spacing.xs },
  emojiCell: (pressed: boolean, hovered: boolean) => ({
    width: theme.size.emojiCell,
    height: theme.size.emojiCell,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: pressed ? theme.opacity.pressedIcon : 1,
    backgroundColor: hovered ? theme.colors.hover : 'transparent',
  }),
  emoji: { ...theme.typography.emoji },
}));
