import { Check, ChevronRight } from 'lucide-react-native';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { type HostInstance, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Badge } from '../Badge';
import { Icon } from '../Icon';
import { Touchable } from '../Touchable';
import { shortcutLabel } from '../shortcuts';
import { Layer, measureAnchor, pointAnchor, Positioned } from './Layer';
import { type MenuAction, type MenuEntry, resolveItems } from './menuModel';
import type { Align, Rect, Side } from './position';
import type { MenuProps } from './types';

type Look = NonNullable<MenuProps['look']>;

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

/** 已展开的子菜单：所在层的第几项、那一行的位置 */
interface OpenSub {
  index: number;
  anchor: Rect;
}

const isAction = (entry: MenuEntry | undefined): entry is MenuAction => entry !== undefined && entry !== 'separator';
const selectable = (entry: MenuEntry | undefined) => isAction(entry) && !entry.disabled;

interface MenuLayerProps {
  items: readonly MenuEntry[];
  anchor: Rect;
  side: Side;
  align: Align;
  atPointer: boolean;
  look: Look;
  minWidth: number | undefined;
  iconEnd: boolean;
  onClose: () => void;
}

function MenuLayer({ items, anchor, side, align, atPointer, look, minWidth, iconEnd, onClose }: MenuLayerProps) {
  const { theme } = useUnistyles();
  const [subs, setSubs] = useState<OpenSub[]>([]);
  /** 每层高亮的项（悬停或方向键），-1 为没有 */
  const [active, setActive] = useState<number[]>([-1]);
  const rows = useRef(new Map<string, HostInstance>());

  // 第 0 层是根菜单，后面每层是上一层展开的子菜单
  const levels: (readonly MenuEntry[])[] = [items];
  for (const sub of subs) {
    const parent = levels[levels.length - 1][sub.index];
    if (!isAction(parent) || !parent.children) break;
    levels.push(parent.children);
  }
  const deepest = levels.length - 1;

  /** 高亮某层的一项，更深层的高亮清掉 */
  const highlight = (level: number, index: number) => setActive((prev) => [...prev.slice(0, level), index]);

  /** 高亮某一项；有子菜单就展开，没有就收起更深的子菜单 */
  const enter = async (level: number, index: number) => {
    highlight(level, index);
    const entry = levels[level][index];
    if (!isAction(entry) || entry.disabled || !entry.children) {
      setSubs((prev) => prev.slice(0, level));
      return;
    }
    if (subs[level]?.index === index) return;
    const rect = await measureAnchor(rows.current.get(`${level}:${index}`) ?? null);
    if (!rect) return;
    // 锚点上下各扩出面板的内边距，子菜单第一项正好与这一行对齐（翻到上方时最后一项对齐）
    const pad = look === 'element' ? theme.size.menuPadYRoomy : theme.size.menuPadY;
    const anchor = { ...rect, y: rect.y - pad, height: rect.height + pad * 2 };
    setSubs((prev) => [...prev.slice(0, level), { index, anchor }]);
  };

  const choose = (level: number, index: number, fromKeyboard: boolean) => {
    const entry = levels[level][index];
    if (!isAction(entry) || entry.disabled) return;
    if (entry.children) {
      void enter(level, index);
      if (fromKeyboard) setActive((prev) => [...prev.slice(0, level + 1), firstSelectable(entry.children!, 0, 1)]);
      return;
    }
    onClose();
    entry.onSelect?.();
  };

  const back = () => {
    if (subs.length === 0) return onClose();
    setSubs((prev) => prev.slice(0, -1));
    setActive((prev) => prev.slice(0, -1));
  };

  // 方向键、回车只在菜单打开期间监听。用捕获阶段抢在获得焦点的行之前处理，免得回车同时触发那一行的按钮；
  // Esc 由 Modal 的 onRequestClose 处理
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const list = levels[deepest];
    const current = active[deepest] ?? -1;
    switch (event.key) {
      case 'ArrowDown':
        highlight(deepest, firstSelectable(list, current + 1, 1));
        break;
      case 'ArrowUp':
        highlight(deepest, firstSelectable(list, current < 0 ? list.length - 1 : current - 1, -1));
        break;
      case 'ArrowRight':
        if (current >= 0 && isAction(list[current]) && list[current].children) choose(deepest, current, true);
        break;
      case 'ArrowLeft':
        if (deepest > 0) back();
        break;
      case 'Enter':
      case ' ':
        if (current >= 0) choose(deepest, current, true);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    document.addEventListener('keydown', listener, true);
    return () => document.removeEventListener('keydown', listener, true);
  }, []);

  // 浏览器焦点跟着高亮走，读屏软件能读出当前项
  const focused = active[deepest] ?? -1;
  useEffect(() => {
    if (focused >= 0) rows.current.get(`${deepest}:${focused}`)?.focus();
  }, [deepest, focused]);

  return (
    <Layer onClose={onClose} onRequestClose={back}>
      {levels.map((entries, level) => (
        <Positioned
          // 换了子菜单要重新量尺寸
          key={level === 0 ? 'root' : `${level}:${subs[level - 1].index}`}
          anchor={level === 0 ? anchor : subs[level - 1].anchor}
          side={level === 0 ? side : 'right'}
          align={level === 0 ? align : 'start'}
          gap={level === 0 && !atPointer ? (look === 'element' ? theme.size.menuGapRoomy : theme.size.menuGap) : 0}
          style={styles.frame(look)}
        >
          <ScrollView style={styles.panel(minWidth)} contentContainerStyle={styles.content(look)} accessibilityRole="menu">
            {entries.map((entry, index) =>
              entry === 'separator' ? (
                <View key={`s${index}`} style={styles.separator} />
              ) : (
                <MenuRow
                  key={index}
                  entry={entry}
                  look={look}
                  iconEnd={iconEnd}
                  leadingSlot={!iconEnd && entries.some((e) => isAction(e) && (e.icon || (e.checked && look === 'iview')))}
                  active={active[level] === index || subs[level]?.index === index}
                  ref={(view) => {
                    const key = `${level}:${index}`;
                    if (view) rows.current.set(key, view);
                    else rows.current.delete(key);
                  }}
                  onHover={() => void enter(level, index)}
                  onPress={() => choose(level, index, false)}
                />
              ),
            )}
          </ScrollView>
        </Positioned>
      ))}
    </Layer>
  );
}

/** 从 start 开始按 step 方向找第一个可选的项，循环查找；没有就返回 -1 */
function firstSelectable(list: readonly MenuEntry[], start: number, step: 1 | -1): number {
  for (let i = 0; i < list.length; i++) {
    const index = (((start + i * step) % list.length) + list.length) % list.length;
    if (selectable(list[index])) return index;
  }
  return -1;
}

interface MenuRowProps {
  entry: MenuAction;
  look: Look;
  iconEnd: boolean;
  /** 同一层有项带图标或打勾时，左侧留出图标位，文字对齐 */
  leadingSlot: boolean;
  active: boolean;
  ref: (view: HostInstance | null) => void;
  onHover: () => void;
  onPress: () => void;
}

function MenuRow({ entry, look, iconEnd, leadingSlot, active, ref, onHover, onPress }: MenuRowProps) {
  const { theme } = useUnistyles();
  const color = entry.disabled ? theme.colors.menuDisabled : entry.destructive ? theme.colors.danger : theme.colors.regularText;
  // element 样式的选中项加粗，iview 样式打勾
  const bold = look === 'element' && !!entry.checked;
  const mark = look === 'iview' && entry.checked && !entry.swatch ? Check : undefined;
  const icon = iconEnd ? entry.icon : (mark ?? entry.icon);
  const figure = entry.swatch ? (
    <View style={styles.swatchBox}>
      <View style={styles.swatch(entry.swatch)}>{entry.checked && <Icon icon={Check} color={theme.palette.onAvatar} size={theme.size.swatch - 3} strokeWidth={3} />}</View>
    </View>
  ) : icon ? (
    <Icon icon={icon} color={color} size={theme.size.iconSmall} strokeWidth={iconEnd ? 1.75 : undefined} />
  ) : null;
  return (
    <Touchable
      ref={ref}
      accessibilityRole="menuitem"
      // 不做 Tab 停靠点，行间移动用方向键
      tabIndex={-1}
      aria-disabled={entry.disabled}
      aria-checked={entry.checked}
      disabled={entry.disabled}
      onHoverIn={onHover}
      onPress={onPress}
      style={styles.row(look, active && !entry.disabled)}
    >
      {leadingSlot && <View style={styles.leading}>{figure}</View>}
      <Text style={styles.label(color, bold)} numberOfLines={1}>
        {entry.label}
      </Text>
      {iconEnd && figure && <View style={styles.trailing(!entry.swatch)}>{figure}</View>}
      {entry.badge ? (
        <Badge count={entry.badge} scale={BADGE_SCALE} origin="right" />
      ) : null}
      {entry.shortcut && !entry.children && <Text style={styles.shortcut}>{shortcutLabel(entry.shortcut)}</Text>}
      {entry.children && <Icon icon={ChevronRight} color={theme.colors.text3} size={theme.size.iconSmall} />}
    </Touchable>
  );
}

/** 旧版分类下拉里的角标缩到 0.7、靠右 */
const BADGE_SCALE = 0.7;

const styles = StyleSheet.create((theme) => ({
  frame: (look: Look) => ({
    borderRadius: theme.radius.menu,
    boxShadow: look === 'element' ? theme.shadow.menuRoomy : theme.shadow.menu,
    borderWidth: look === 'element' ? 1 : 0,
    borderColor: theme.colors.menuBorder,
  }),
  panel: (minWidth: number | undefined) => ({
    minWidth: minWidth ?? theme.size.menuMinWidth,
    maxWidth: theme.size.menuMaxWidth,
  }),
  content: (look: Look) => ({
    paddingVertical: look === 'element' ? theme.size.menuPadYRoomy : theme.size.menuPadY,
  }),
  row: (look: Look, active: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    height: look === 'element' ? theme.size.menuRowRoomy : theme.size.menuRow,
    paddingHorizontal: look === 'element' ? theme.size.menuPadXRoomy : theme.size.menuPadX,
    gap: theme.spacing.sm,
    backgroundColor: active ? (look === 'element' ? theme.colors.emptyFill : theme.colors.menuHover) : 'transparent',
    // 高亮底色就是焦点指示，不再画浏览器焦点框
    outlineStyle: 'solid',
    outlineWidth: 0,
  }),
  leading: {
    width: theme.size.iconSmall,
    alignItems: 'center',
  },
  trailing: (dim: boolean) => ({
    marginLeft: theme.size.menuPadX - theme.spacing.sm,
    opacity: dim ? 0.7 : 1,
  }),
  label: (color: string, bold: boolean) => ({
    ...theme.typography.menuItem,
    flex: 1,
    color,
    fontWeight: bold ? '700' : theme.typography.menuItem.fontWeight,
  }),
  swatchBox: {
    width: theme.size.iconSmall,
    height: theme.size.iconSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: (color: string) => ({
    width: theme.size.swatch,
    height: theme.size.swatch,
    borderRadius: theme.radius.swatch,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color,
  }),
  shortcut: {
    ...theme.typography.footnote,
    color: theme.colors.text3,
  },
  // 同旧版分隔项：线上方留 5，线下方还有一块 5 高的占位（iView divided 的 :before）
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: theme.size.menuPadY,
    backgroundColor: theme.colors.menuDivider,
  },
}));
