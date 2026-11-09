import { Plus } from 'lucide-react-native';
import { Fragment, useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { BackHandler, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { KeyboardEvents, OverKeyboardView } from 'react-native-keyboard-controller';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '../../platform/haptics';
import { Icon } from '../Icon';
import type { MenuAction, MenuSection } from '../popover/menuModel';
import type { Rect } from '../popover/position';
import { MenuBackdrop } from './MenuBackdrop';

export interface ActionMenuRequest {
  /** 被长按的那一行在窗口里的位置；浮起的预览按它重画 */
  anchor: Rect;
  /** 菜单与表情条贴哪一侧：自己的消息靠右，别人的靠左 */
  align: 'left' | 'right';
  /** 贴边一侧离屏幕边缘的距离（与气泡对齐） */
  inset: number;
  sections: readonly MenuSection[];
  /** 浮起的消息：按 anchor 的位置重画 */
  preview: ReactNode;
  /** 预览上方的表情条；mine 为自己已回应的（高亮，再点取消）；all 为「+」展开的全部表情 */
  reactions?: { emojis: readonly string[]; all: readonly string[]; mine: readonly string[]; onPick: (symbol: string) => void };
}

const DIVIDER = StyleSheet.hairlineWidth;
const GRID_COLUMNS = 7;
/** 消息太高时菜单最少给它留出的可见高度 */
const MIN_PREVIEW = 64;
/** 打开：消息浮起移到新位置、菜单从消息一侧展开，同一条减速曲线，不过冲 */
const OPEN_TIMING = { duration: 300, easing: Easing.bezier(0.25, 1, 0.5, 1) };
/** 关闭：原路收回 */
const CLOSE_TIMING = { duration: 200, easing: Easing.bezier(0.4, 0, 0.2, 1) };
/** 浮起的消息放大到多少：以底边为准往上长，表情条要让出长出的这截 */
const PREVIEW_SCALE = 1.02;
/** 菜单与表情条展开前的缩放 */
const MENU_FROM = 0.4;

/**
 * 长按消息的菜单（ui-spec 第 5 节）：被长按的消息浮起、背景压暗，上方表情条，下方分组的紧凑菜单。
 * 画在键盘之上且不收起键盘：选完回复、编辑可以接着打字。点空白处或系统返回键关闭；选中一项先收回再执行
 */
export function ActionMenu({ request, onClose }: { request: ActionMenuRequest; onClose: () => void }) {
  const { theme, rt } = useUnistyles();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const [rootY, setRootY] = useState<number | null>(null);
  /** 表情条点了「+」：菜单换成全部表情 */
  const [allEmojis, setAllEmojis] = useState(false);

  // 0 → 1：消息从原位移到新位置并轻微放大，表情条与菜单跟着它从消息一侧展开；关闭时原路收回
  const progress = useSharedValue(0);
  const closing = useRef(false);
  const afterClose = useRef<(() => void) | undefined>(undefined);
  const finish = useCallback(() => {
    onClose();
    afterClose.current?.();
  }, [onClose]);
  const close = useCallback((after?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    afterClose.current = after;
    progress.set(withTiming(0, CLOSE_TIMING, (done) => {
      if (done) runOnJS(finish)();
    }));
  }, [progress, finish]);

  useEffect(() => {
    haptics.light();
    const subs = [
      BackHandler.addEventListener('hardwareBackPress', () => {
        close();
        return true;
      }),
      // 键盘弹着时安卓返回键先被输入法拿去收键盘：菜单盖在键盘上面，跟着一起收
      KeyboardEvents.addListener('keyboardWillHide', () => close()),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, [close]);

  useEffect(() => {
    if (rootY !== null && !closing.current) progress.set(withTiming(1, OPEN_TIMING));
  }, [progress, rootY]);

  const { anchor, sections, reactions } = request;
  const { spacing, size } = theme;
  const margin = spacing.sm;
  const gap = spacing.sm;
  const cell = size.emojiCell;
  const barPad = spacing.xs;
  const barHeight = cell + barPad * 2;
  const itemHeight = size.actionMenuRow;
  const groupPad = spacing.xs;
  const menuWidth = size.actionMenuWidth;

  const top = anchor.y - (rootY ?? 0);
  const upper = rt.insets.top + margin;
  const lower = screenHeight - rt.insets.bottom - margin;
  const above = reactions ? barHeight + gap : 0;

  const gridWidth = Math.min(GRID_COLUMNS * cell + barPad * 2, screenWidth - margin * 2);
  const itemCount = sections.reduce((sum, section) => sum + section.length, 0);
  const contentHeight = allEmojis && reactions
    ? Math.ceil(reactions.all.length / GRID_COLUMNS) * cell + barPad * 2
    : itemCount * itemHeight + sections.length * groupPad * 2 + Math.max(0, sections.length - 1) * DIVIDER;
  // 太长时菜单内滚动，至少给消息留出一截
  const menuHeight = Math.min(contentHeight, lower - upper - above - gap - MIN_PREVIEW);

  // 菜单放在消息下方，不盖住消息：放不下时把消息往上推，太高的消息上半截移出屏幕。
  // 表情条放在消息上方；消息顶到屏幕上沿时表情条压在消息上
  const grown = anchor.height * (PREVIEW_SCALE - 1);
  const highest = upper + above + grown;
  const lowest = lower - menuHeight - gap - anchor.height;
  const previewTop = Math.min(top, lowest) < highest && highest <= lowest ? highest : Math.min(top, lowest);
  const shift = previewTop - top;
  const menuTop = previewTop + anchor.height + gap;
  const barTop = Math.max(upper, previewTop - grown - gap - barHeight);
  const side = (width: number) => {
    const offset = Math.min(request.inset, screenWidth - width - margin);
    return request.align === 'left' ? { left: offset } : { right: offset };
  };

  const select = (item: MenuAction) => close(item.onSelect);
  const pick = (symbol: string) => close(() => reactions?.onPick(symbol));
  const showAll = () => {
    haptics.selection();
    setAllEmojis(true);
  };

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const previewStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * -shift }, { scale: 1 + progress.get() * (PREVIEW_SCALE - 1) }],
  }));
  // 跟着消息一起移动，从贴着消息的那一侧展开
  const popStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.5], [0, 1], 'clamp'),
    transform: [{ translateY: (1 - progress.get()) * -shift }, { scale: MENU_FROM + (1 - MENU_FROM) * progress.get() }],
  }));
  const horizontal = request.align;

  const emojiCell = (symbol: string, index: number) => (
    <Pressable key={index} onPress={() => pick(symbol)} style={({ pressed }) => [styles.emojiCell(cell), pressed && styles.pressed]}>
      <View style={[styles.emojiHit, reactions?.mine.includes(symbol) && styles.emojiMine]}>
        <Text style={styles.emoji} allowFontScaling={false}>{symbol}</Text>
      </View>
    </Pressable>
  );
  const barWidth = reactions ? Math.min((reactions.emojis.length + 1) * cell + barPad * 2, screenWidth - margin * 2) : 0;

  return (
    <OverKeyboardView visible>
      <View ref={rootRef} style={StyleSheet.absoluteFill} onLayout={() => rootRef.current?.measureInWindow((_x, y) => setRootY(y))}>
        <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
          <MenuBackdrop />
          <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={() => close()} accessibilityRole="button" />
        </Animated.View>
        {rootY !== null && (
          <>
            <Animated.View pointerEvents="none" style={[styles.preview, { top: top + shift, left: anchor.x, width: anchor.width, transformOrigin: `${horizontal} bottom` }, previewStyle]}>
              {request.preview}
            </Animated.View>
            {reactions && (
              <Animated.View style={[styles.bar(barHeight, barPad), side(barWidth), { top: barTop, width: barWidth, transformOrigin: `${horizontal} bottom` }, popStyle]}>
                <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.barContent}>
                  {reactions.emojis.map(emojiCell)}
                </ScrollView>
                <Pressable onPress={showAll} hitSlop={spacing.xs} style={({ pressed }) => [styles.emojiCell(cell), pressed && styles.pressed]}>
                  <View style={[styles.emojiHit, styles.emojiMore]}>
                    <Icon icon={Plus} color={theme.colors.text2} size={size.iconSmall} />
                  </View>
                </Pressable>
              </Animated.View>
            )}
            {allEmojis && reactions ? (
              <View style={[styles.menu, side(gridWidth), { top: menuTop, width: gridWidth, height: menuHeight }]}>
                <ScrollView style={styles.menuScroll} keyboardShouldPersistTaps="always" contentContainerStyle={styles.grid(barPad)}>
                  {reactions.all.map(emojiCell)}
                </ScrollView>
              </View>
            ) : (
              // 阴影画在外层：滚动视图会裁掉超出自身的部分
              <Animated.View
                style={[styles.menu, side(menuWidth), { top: menuTop, width: menuWidth, height: menuHeight, transformOrigin: `${horizontal} top` }, popStyle]}
              >
                <ScrollView style={styles.menuScroll} keyboardShouldPersistTaps="always" scrollEnabled={menuHeight < contentHeight} showsVerticalScrollIndicator={false}>
                  {sections.map((section, index) => (
                    <Fragment key={index}>
                      {index > 0 && <View style={styles.divider} />}
                      <View style={{ paddingVertical: groupPad }}>
                        {section.map((item, i) => (
                          <Pressable
                            key={i}
                            disabled={item.disabled}
                            onPress={() => select(item)}
                            accessibilityRole="menuitem"
                            style={({ pressed }) => [styles.item(itemHeight), pressed && styles.itemPressed, item.disabled && styles.disabled]}
                          >
                            <Text style={[styles.itemText, item.destructive && styles.danger]} numberOfLines={1}>{item.label}</Text>
                            {!!item.icon && <Icon icon={item.icon} color={item.destructive ? theme.colors.danger : theme.colors.text2} size={size.iconSmall} />}
                          </Pressable>
                        ))}
                      </View>
                    </Fragment>
                  ))}
                </ScrollView>
              </Animated.View>
            )}
          </>
        )}
      </View>
    </OverKeyboardView>
  );
}

const styles = StyleSheet.create((theme) => ({
  scrim: { backgroundColor: theme.colors.menuScrim },
  preview: { position: 'absolute' },
  menu: { position: 'absolute', borderRadius: theme.radius.card, backgroundColor: theme.colors.surface, boxShadow: theme.shadow.popover },
  menuScroll: { flex: 1, borderRadius: theme.radius.card, overflow: 'hidden' },
  divider: { height: DIVIDER, backgroundColor: theme.colors.separator },
  item: (height: number) => ({ height, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg }),
  itemPressed: { backgroundColor: theme.colors.fillPressed },
  itemText: { ...theme.typography.callout, flex: 1, color: theme.colors.text },
  danger: { color: theme.colors.danger },
  disabled: { opacity: theme.opacity.disabled },
  pressed: { opacity: theme.opacity.pressedIcon },
  bar: (height: number, pad: number) => ({
    position: 'absolute', height, flexDirection: 'row', alignItems: 'center', paddingHorizontal: pad,
    borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface, boxShadow: theme.shadow.popover,
  }),
  barContent: { alignItems: 'center' },
  grid: (pad: number) => ({ flexDirection: 'row', flexWrap: 'wrap', padding: pad }),
  emojiCell: (cell: number) => ({ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }),
  emojiHit: { width: theme.size.chatInput, height: theme.size.chatInput, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  emojiMine: { backgroundColor: theme.colors.primarySoft },
  emojiMore: { backgroundColor: theme.colors.fill },
  emoji: { ...theme.typography.emoji },
}));
