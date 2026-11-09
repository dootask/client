import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { emoticonPacks, matchEmoticons, mentionQuery, quickKeyword, type Emoticon, type PickerChar } from '../../../sync/messenger';
import { KeepFocus, useChat } from '../../../ui/chat';
import { Touchable } from '../../../ui/Touchable';
import { useComposeState, type ComposeStore } from './composeStore';

/** 正在输入候选（@ 人、/ 菜单等）时让给候选浮层 */
const PICKER_CHARS: readonly PickerChar[] = ['@', '#', '~', '%', '/'];
/** 多久没有交互（打字、移动光标、拖动表情）就收起 */
const QUICK_IDLE = 4000;
/** 出现、收起的淡入淡出；闲置收起时慢慢淡出（收起键盘时跟着键盘快速消失） */
const QUICK_FADE = 120;
const QUICK_IDLE_FADE = 800;

/**
 * 快捷表情：输入的文字恰好是某个表情包的名称或关键词时，在输入栏上方横排列出，点按直接发送并清空输入。
 * 编辑消息、带 @ 等提及时不出；origin 是服务器根地址（带结尾的 /）
 */
export function QuickEmoticons({ store, origin, enabled, onPick }: {
  store: ComposeStore;
  origin: string;
  enabled: boolean;
  onPick: (item: Emoticon) => void;
}) {
  const { theme } = useUnistyles();
  const { value, cursor } = useComposeState(store);
  const keyword = enabled && value.mentions.length === 0 && !mentionQuery(value, cursor, PICKER_CHARS) ? quickKeyword(value.text) : '';
  const items = useMemo(() => matchEmoticons(emoticonPacks(origin), keyword), [origin, keyword]);
  const quick = useQuickShown(value.text, cursor, items.length > 0);
  if (!quick.shown) return null;
  return (
    <Animated.View entering={FadeIn.duration(QUICK_FADE)} exiting={FadeOut.duration(quick.fadeOut)} style={styles.card}>
      <KeepFocus>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.row}
          onScrollBeginDrag={quick.touch}
          onScrollEndDrag={quick.touch}
          onMomentumScrollEnd={quick.touch}
        >
          {items.map((item, index) => (
            <Touchable key={`${index}${item.src}`} accessibilityRole="button" accessibilityLabel={item.name} onPress={() => onPick(item)} style={({ pressed, hovered }) => styles.item(pressed, hovered)}>
              <Image source={item.src} style={{ width: theme.size.quickSticker, height: theme.size.quickSticker }} contentFit="contain" cachePolicy="memory-disk" />
            </Touchable>
          ))}
        </ScrollView>
      </KeepFocus>
    </Animated.View>
  );
}

/**
 * 能不能显示：只在键盘弹着（Web 是输入框聚焦）时显示，收起键盘（含切到面板）或闲置 QUICK_IDLE 后收起；
 * 收起时记下当时的文字，文字没变就不再出现（重新弹出键盘也不），改了文字就忘掉、重新匹配
 */
function useQuickShown(text: string, cursor: number, matched: boolean) {
  const { keyboardShown } = useChat();
  // 闲置到时的文字：先按它换上慢的淡出提交一次，下一帧再撤（撤掉时用的是最后一次渲染的淡出时长）
  const [idleFor, setIdleFor] = useState<string | null>(null);
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);
  if (!keyboardShown && matched && hiddenFor !== text) setHiddenFor(text);
  // 文字一改就忘掉：删回原来的字、清空重打都重新出现
  else if (hiddenFor !== null && hiddenFor !== text && idleFor === null) setHiddenFor(null);
  const shown = matched && keyboardShown && hiddenFor !== text;
  const [touched, setTouched] = useState(0);
  const touch = useCallback(() => setTouched((n) => n + 1), []);
  // 显示时开始计时，打字、移动光标、拖动都重新计
  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(() => setIdleFor(text), QUICK_IDLE);
    return () => clearTimeout(timer);
  }, [shown, text, cursor, touched]);
  useEffect(() => {
    if (idleFor === null) return;
    const frame = requestAnimationFrame(() => {
      setHiddenFor(idleFor);
      setIdleFor(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [idleFor]);
  return { shown, touch, fadeOut: idleFor === text ? QUICK_IDLE_FADE : QUICK_FADE };
}

const styles = StyleSheet.create((theme) => ({
  card: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.popover,
  },
  row: { padding: theme.spacing.xs, gap: theme.spacing.xs },
  item: (pressed: boolean, hovered: boolean) => ({
    borderRadius: theme.radius.block,
    opacity: pressed ? theme.opacity.pressedIcon : 1,
    backgroundColor: hovered ? theme.colors.hover : undefined,
  }),
}));
