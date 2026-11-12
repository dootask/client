import { Check, ChevronRight } from "lucide-react-native";
import { type ReactNode, useRef, useState } from "react";
import { type HostInstance, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Badge } from "../Badge";
import { Icon } from "../Icon";
import { Touchable } from "../Touchable";
import { shortcutLabel } from "../shortcuts";
import { Layer, measureAnchor, Positioned } from "./Layer";
import { useMenuKeyboard } from "./menuKeyboard";
import type { MenuAction, MenuEntry } from "./menuModel";
import type { Align, Rect, Side } from "./position";
import type { MenuProps } from "./types";

export type MenuLook = NonNullable<MenuProps["look"]>;

/** 已展开的子菜单：所在层的第几项、那一行的位置 */
interface OpenSub {
  index: number;
  anchor: Rect;
}

const isAction = (entry: MenuEntry | undefined): entry is MenuAction =>
  entry !== undefined && entry !== "separator";
const selectable = (entry: MenuEntry | undefined) =>
  isAction(entry) && !entry.disabled;

export interface MenuLayerProps {
  items: readonly MenuEntry[];
  anchor: Rect;
  side: Side;
  align: Align;
  /** 右键菜单：左上角在鼠标位置，超出窗口贴边往回推（不用 side / align） */
  atPointer: boolean;
  look: MenuLook;
  minWidth: number | undefined;
  iconEnd: boolean;
  /** 按下的行也给悬停底色：App 触屏没有悬停（旧版 WebView 里点按有悬停色）；Web 不传，保持原样 */
  pressTint?: boolean;
  /** 列表上方的独立一块（如消息菜单的表情条），和列表一起定位；样式自理。没有菜单项时只显示它 */
  header?: ReactNode;
  onClose: () => void;
}

/**
 * 自绘菜单的弹出层，样式同旧版的下拉菜单（docs/ui-spec.md 9.3）：Web / 桌面的所有菜单，
 * 以及 App 上照旧版 WebView 页面自绘的菜单（Menu 的 drawn）。
 * 贴边自动翻转，子菜单悬停、点击或方向键展开；点外面、按 Esc / 返回键关闭
 */
export function MenuLayer({
  items,
  anchor,
  side,
  align,
  atPointer,
  look,
  minWidth,
  iconEnd,
  pressTint = false,
  header,
  onClose,
}: MenuLayerProps) {
  const { theme } = useUnistyles();
  const [subs, setSubs] = useState<OpenSub[]>([]);
  /** 每层高亮的项（悬停或方向键），-1 为没有 */
  const [active, setActive] = useState<number[]>([-1]);
  const rows = useRef(new Map<string, HostInstance>());
  /** 带上方块时列表自身的宽度：列表比上方块窄时水平贴近鼠标，不跟着上方块一起被推开 */
  const [listWidth, setListWidth] = useState<number | null>(null);

  // 第 0 层是根菜单，后面每层是上一层展开的子菜单
  const levels: (readonly MenuEntry[])[] = [items];
  for (const sub of subs) {
    const parent = levels[levels.length - 1][sub.index];
    if (!isAction(parent) || !parent.children) break;
    levels.push(parent.children);
  }
  const deepest = levels.length - 1;

  /** 高亮某层的一项，更深层的高亮清掉 */
  const highlight = (level: number, index: number) =>
    setActive((prev) => [...prev.slice(0, level), index]);

  /** 高亮某一项；有子菜单就展开，没有就收起更深的子菜单 */
  const enter = async (level: number, index: number) => {
    highlight(level, index);
    const entry = levels[level][index];
    if (!isAction(entry) || entry.disabled || !entry.children) {
      setSubs((prev) => prev.slice(0, level));
      return;
    }
    if (subs[level]?.index === index) return;
    const rect = await measureAnchor(
      rows.current.get(`${level}:${index}`) ?? null,
    );
    if (!rect) return;
    // 锚点上下各扩出面板的内边距，子菜单第一项正好与这一行对齐（翻到上方时最后一项对齐）
    const pad =
      look === "element" ? theme.size.menuPadYRoomy : theme.size.menuPadY;
    const anchor = { ...rect, y: rect.y - pad, height: rect.height + pad * 2 };
    setSubs((prev) => [...prev.slice(0, level), { index, anchor }]);
  };

  const choose = (level: number, index: number, fromKeyboard: boolean) => {
    const entry = levels[level][index];
    if (!isAction(entry) || entry.disabled) return;
    if (entry.children) {
      void enter(level, index);
      if (fromKeyboard)
        setActive((prev) => [
          ...prev.slice(0, level + 1),
          firstSelectable(entry.children!, 0, 1),
        ]);
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

  // 方向键、回车（只有 Web 有键盘操作）；Esc、返回键由 Layer 的 onRequestClose 处理
  const focused = active[deepest] ?? -1;
  useMenuKeyboard({
    onKey: (key) => {
      const list = levels[deepest];
      switch (key) {
        case "ArrowDown":
          highlight(deepest, firstSelectable(list, focused + 1, 1));
          return true;
        case "ArrowUp":
          highlight(
            deepest,
            firstSelectable(
              list,
              focused < 0 ? list.length - 1 : focused - 1,
              -1,
            ),
          );
          return true;
        case "ArrowRight":
          if (focused >= 0 && isAction(list[focused]) && list[focused].children)
            choose(deepest, focused, true);
          return true;
        case "ArrowLeft":
          if (deepest > 0) back();
          return true;
        case "Enter":
        case " ":
          if (focused >= 0) choose(deepest, focused, true);
          return true;
        default:
          return false;
      }
    },
    // 焦点跟着高亮走，读屏软件能读出当前项
    focusRow: () =>
      focused >= 0 ? (rows.current.get(`${deepest}:${focused}`) ?? null) : null,
    focusKey: `${deepest}:${focused}`,
  });

  return (
    <Layer onClose={onClose} onRequestClose={back}>
      {levels.map((entries, level) => {
        const list = entries.length > 0 && (
          <ScrollView
            style={styles.panel(minWidth)}
            contentContainerStyle={styles.content(look)}
            accessibilityRole="menu"
          >
            {entries.map((entry, index) =>
              entry === "separator" ? (
                <View key={`s${index}`} style={styles.separator} />
              ) : (
                <MenuRow
                  key={index}
                  entry={entry}
                  look={look}
                  iconEnd={iconEnd}
                  pressTint={pressTint}
                  leadingSlot={
                    !iconEnd &&
                    entries.some(
                      (e) =>
                        isAction(e) &&
                        (e.icon || (e.checked && look === "iview")),
                    )
                  }
                  active={
                    active[level] === index || subs[level]?.index === index
                  }
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
        );
        const withHeader = level === 0 && header !== undefined;
        return (
          <Positioned
            // 换了子菜单要重新量尺寸
            key={level === 0 ? "root" : `${level}:${subs[level - 1].index}`}
            anchor={level === 0 ? anchor : subs[level - 1].anchor}
            side={level === 0 ? side : "right"}
            align={level === 0 ? align : "start"}
            gap={
              level === 0 && !atPointer
                ? look === "element"
                  ? theme.size.menuGapRoomy
                  : theme.size.menuGap
                : 0
            }
            atPoint={level === 0 && atPointer}
            passThrough={withHeader}
            style={withHeader ? styles.stack : styles.frame(look)}
          >
            {withHeader
              ? (placed) => (
                  <>
                    {header}
                    {list && (
                      <View
                        onLayout={(event) =>
                          setListWidth(event.nativeEvent.layout.width)
                        }
                        style={[
                          styles.frame(look),
                          styles.framed,
                          styles.shift(
                            placed && listWidth !== null
                              ? Math.max(
                                  0,
                                  Math.min(
                                    anchor.x - placed.left,
                                    placed.width - listWidth,
                                  ),
                                )
                              : 0,
                          ),
                        ]}
                      >
                        {list}
                      </View>
                    )}
                  </>
                )
              : list}
          </Positioned>
        );
      })}
    </Layer>
  );
}

/** 从 start 开始按 step 方向找第一个可选的项，循环查找；没有就返回 -1 */
function firstSelectable(
  list: readonly MenuEntry[],
  start: number,
  step: 1 | -1,
): number {
  for (let i = 0; i < list.length; i++) {
    const index =
      (((start + i * step) % list.length) + list.length) % list.length;
    if (selectable(list[index])) return index;
  }
  return -1;
}

interface MenuRowProps {
  entry: MenuAction;
  look: MenuLook;
  iconEnd: boolean;
  pressTint: boolean;
  /** 同一层有项带图标或打勾时，左侧留出图标位，文字对齐 */
  leadingSlot: boolean;
  active: boolean;
  ref: (view: HostInstance | null) => void;
  onHover: () => void;
  onPress: () => void;
}

function MenuRow({
  entry,
  look,
  iconEnd,
  pressTint,
  leadingSlot,
  active,
  ref,
  onHover,
  onPress,
}: MenuRowProps) {
  const { theme } = useUnistyles();
  const color = entry.disabled
    ? theme.colors.menuDisabled
    : entry.destructive
      ? theme.colors.danger
      : theme.colors.regularText;
  // element 样式的选中项加粗，iview 样式打勾
  const bold = look === "element" && !!entry.checked;
  const mark =
    look === "iview" && entry.checked && !entry.swatch ? Check : undefined;
  const icon = iconEnd ? entry.icon : (mark ?? entry.icon);
  const figure = entry.swatch ? (
    <View style={styles.swatchBox}>
      <View style={styles.swatch(entry.swatch)}>
        {entry.checked && (
          <Icon
            icon={Check}
            color={theme.palette.onAvatar}
            size={theme.size.swatch - 3}
            strokeWidth={3}
          />
        )}
      </View>
    </View>
  ) : icon ? (
    <Icon
      icon={icon}
      color={color}
      size={theme.size.iconSmall}
      strokeWidth={iconEnd ? 1.75 : undefined}
    />
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
      style={({ pressed }) =>
        styles.row(look, (active || (pressTint && pressed)) && !entry.disabled)
      }
    >
      {leadingSlot && <View style={styles.leading}>{figure}</View>}
      <Text style={styles.label(color, bold)} numberOfLines={1}>
        {entry.label}
      </Text>
      {iconEnd && figure && (
        <View style={styles.trailing(!entry.swatch)}>{figure}</View>
      )}
      {entry.badge ? (
        <Badge count={entry.badge} scale={BADGE_SCALE} origin="right" />
      ) : null}
      {entry.shortcut && !entry.children && (
        <Text style={styles.shortcut}>{shortcutLabel(entry.shortcut)}</Text>
      )}
      {entry.children && (
        <Icon
          icon={ChevronRight}
          color={theme.colors.text3}
          size={theme.size.iconSmall}
        />
      )}
    </Touchable>
  );
}

/** 旧版分类下拉里的角标缩到 0.7、靠右 */
const BADGE_SCALE = 0.7;

const styles = StyleSheet.create((theme) => ({
  // 带表情条等上方块时，外层只管定位，列表自己画面板
  stack: {
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    backgroundColor: "transparent",
    borderRadius: 0,
    boxShadow: "none",
    overflow: "visible",
  },
  framed: {
    flexShrink: 1,
    minHeight: 0,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  shift: (left: number) => ({ marginLeft: left }),
  frame: (look: MenuLook) => ({
    borderRadius: theme.radius.menu,
    boxShadow: look === "element" ? theme.shadow.menuRoomy : theme.shadow.menu,
    borderWidth: look === "element" ? 1 : 0,
    borderColor: theme.colors.menuBorder,
  }),
  panel: (minWidth: number | undefined) => ({
    minWidth: minWidth ?? theme.size.menuMinWidth,
    maxWidth: theme.size.menuMaxWidth,
  }),
  content: (look: MenuLook) => ({
    paddingVertical:
      look === "element" ? theme.size.menuPadYRoomy : theme.size.menuPadY,
  }),
  row: (look: MenuLook, active: boolean) => ({
    flexDirection: "row",
    alignItems: "center",
    height: look === "dialog" ? theme.size.group.menuRow : look === "element" ? theme.size.menuRowRoomy : theme.size.menuRow,
    paddingHorizontal:
      look === "dialog" ? theme.size.group.menuPad : look === "element" ? theme.size.menuPadXRoomy : theme.size.menuPadX,
    gap: theme.spacing.sm,
    backgroundColor: active
      ? look === "element"
        ? theme.colors.emptyFill
        : theme.colors.menuHover
      : "transparent",
    // 高亮底色就是焦点指示，不再画浏览器焦点框
    outlineStyle: "solid",
    outlineWidth: 0,
  }),
  leading: {
    width: theme.size.iconSmall,
    alignItems: "center",
  },
  trailing: (dim: boolean) => ({
    marginLeft: theme.size.menuPadX - theme.spacing.sm,
    opacity: dim ? 0.7 : 1,
  }),
  // 宽度按文字算（flex: 1 在原生上 basis 为 0，菜单会缩到最小宽度把文字截掉），超过最大宽度再缩
  label: (color: string, bold: boolean) => ({
    ...theme.typography.menuItem,
    flexGrow: 1,
    flexShrink: 1,
    color,
    fontWeight: bold ? "700" : theme.typography.menuItem.fontWeight,
  }),
  swatchBox: {
    width: theme.size.iconSmall,
    height: theme.size.iconSmall,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: (color: string) => ({
    width: theme.size.swatch,
    height: theme.size.swatch,
    borderRadius: theme.radius.swatch,
    alignItems: "center",
    justifyContent: "center",
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
