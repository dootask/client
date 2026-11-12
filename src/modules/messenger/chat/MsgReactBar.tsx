import { ChevronDown } from 'lucide-react-native';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { emojiGroups } from '../../../sync/messenger';
import { Icon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import { quickReactions } from './emoji';

/** 全部表情每行几个 */
const ALL_COLUMNS = 9;

/**
 * Web 消息菜单上方的表情条（只有 BubbleTouch.web 用）：常用表情（最近用过的在前）一排，放不下横向滚；
 * 右端箭头换成全部表情
 */
export function MsgReactBar({ onPick, onMore }: { onPick: (symbol: string) => void; onMore: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  return (
    <View testID="msg-react-bar" accessibilityLabel={t('messenger:chat.react')} style={styles.bar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
        {quickReactions().map((symbol) => (
          <EmojiCell key={symbol} symbol={symbol} onPick={onPick} />
        ))}
      </ScrollView>
      <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:chat.emoji')} onPress={onMore} style={({ hovered }) => styles.more(hovered)}>
        <Icon icon={ChevronDown} size={theme.size.msgReact.moreIcon} color={theme.colors.text2} />
      </Touchable>
    </View>
  );
}

/** 全部表情：每行 9 个，超出滚动；一千多个，用列表只画看得到的 */
export function MsgReactAll({ onPick }: { onPick: (symbol: string) => void }) {
  const symbols = emojiGroups().flatMap((group) => group.emojis);
  return (
    <FlatList
      testID="msg-react-all"
      data={symbols}
      numColumns={ALL_COLUMNS}
      keyExtractor={(_, index) => String(index)}
      initialNumToRender={ALL_COLUMNS * 8}
      style={styles.all}
      contentContainerStyle={styles.allGrid}
      renderItem={({ item }) => <EmojiCell symbol={item} onPick={onPick} />}
    />
  );
}

function EmojiCell({ symbol, onPick }: { symbol: string; onPick: (symbol: string) => void }) {
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={symbol} onPress={() => onPick(symbol)} style={({ pressed, hovered }) => styles.cell(pressed, hovered)}>
      <Text style={styles.emoji} allowFontScaling={false}>{symbol}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => {
  const r = theme.size.msgReact;
  const panel = { borderRadius: theme.radius.menu, backgroundColor: theme.colors.surface, boxShadow: theme.shadow.menu };
  return {
    bar: { ...panel, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', padding: r.pad },
    scroll: { flexShrink: 1 },
    row: { alignItems: 'center' },
    more: (hovered: boolean) => ({
      width: r.more,
      height: r.cell,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.menu,
      backgroundColor: hovered ? theme.colors.menuHover : 'transparent',
    }),
    cell: (pressed: boolean, hovered: boolean) => ({
      width: r.cell,
      height: r.cell,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.menu,
      opacity: pressed ? theme.opacity.pressedIcon : 1,
      backgroundColor: hovered ? theme.colors.menuHover : 'transparent',
    }),
    emoji: theme.typography.msgReactEmoji,
    all: { ...panel, flexGrow: 0, width: r.cell * ALL_COLUMNS + r.pad * 2, maxWidth: '100%', height: r.cell * r.allRows + r.pad * 2 },
    allGrid: { padding: r.pad },
  };
});
