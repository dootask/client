import { Image } from 'expo-image';
import { Car, Delete, Flag, Lightbulb, PawPrint, Search, Shapes, Smile, Trophy, UtensilsCrossed, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { emojiGroups, emoticonPacks, type EmojiCategory, type Emoticon, type EmoticonPack } from '../../../sync/messenger';
import { KeepFocus } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';

const EMOJI_COLUMNS = 8;
const STICKER_COLUMNS = 4;
const CATEGORY_ICONS: Record<EmojiCategory, LucideIcon> = {
  p: Smile, n: PawPrint, d: UtensilsCrossed, s: Shapes, a: Trophy, t: Car, o: Lightbulb, f: Flag,
};

// expo-image 不是 unistyles 接管的组件，Web 上收不到 StyleSheet 生成的样式，尺寸直接传

/**
 * 表情面板（与加号面板同高）：底部切换 emoji 和各套表情包，emoji 插到光标处，表情包点按直接发送；
 * 左下是搜索在线贴纸（要打字，弹层不放在面板里）。origin 是服务器根地址（带结尾的 /）
 */
export function EmojiPanel({ origin, onInsert, onDelete, onSend, onSearch }: {
  origin: string;
  onInsert: (emoji: string) => void;
  onDelete: () => void;
  onSend: (item: Emoticon) => void;
  onSearch: () => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const packs = emoticonPacks(origin);
  const [category, setCategory] = useState<EmojiCategory>('p');
  /** 选中的表情包；null 是 emoji */
  const [pack, setPack] = useState<EmoticonPack | null>(null);
  const emojis = emojiGroups().find((group) => group.type === category)?.emojis ?? [];

  return (
    <KeepFocus style={styles.root}>
      {pack ? (
        <StickerGrid key={pack.name} items={pack.items} onPick={onSend} />
      ) : (
        <View style={styles.root}>
          <View style={styles.categories}>
            {emojiGroups().map(({ type }) => (
              <Touchable key={type} hitSlop={theme.spacing.xs} onPress={() => setCategory(type)} style={({ hovered }) => styles.category(type === category, hovered)}>
                <Icon icon={CATEGORY_ICONS[type]} color={type === category ? theme.colors.text : theme.colors.text3} size={theme.size.iconSmall} />
              </Touchable>
            ))}
          </View>
          <FlatList
            key={category}
            data={emojis}
            numColumns={EMOJI_COLUMNS}
            keyExtractor={(emoji, index) => `${index}${emoji}`}
            initialNumToRender={EMOJI_COLUMNS * 6}
            getItemLayout={(_, index) => ({ length: theme.size.emojiCell, offset: theme.size.emojiCell * Math.floor(index / EMOJI_COLUMNS), index })}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={styles.emojiList}
            renderItem={({ item }) => (
              <Touchable accessibilityRole="button" accessibilityLabel={item} onPress={() => onInsert(item)} style={({ pressed, hovered }) => styles.emojiCell(pressed, hovered)}>
                <Text allowFontScaling={false} style={styles.emoji}>{item}</Text>
              </Touchable>
            )}
          />
          <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:chat.delete')} onPress={onDelete} style={({ pressed }) => styles.delete(pressed)}>
            <Icon icon={Delete} color={theme.colors.text2} size={theme.size.icon} />
          </Touchable>
        </View>
      )}

      <View style={styles.tabs}>
        <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:chat.searchSticker')} onPress={onSearch} style={({ hovered }) => styles.tab(false, hovered)}>
          <Icon icon={Search} color={theme.colors.text2} size={theme.size.icon} />
        </Touchable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always">
          <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:chat.emoji')} onPress={() => setPack(null)} style={({ hovered }) => styles.tab(!pack, hovered)}>
            <Icon icon={Smile} color={theme.colors.text2} size={theme.size.icon} />
          </Touchable>
          {packs.map((item) => (
            <Touchable
              key={item.name}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              onPress={() => setPack(item)}
              style={({ hovered }) => styles.tab(pack?.name === item.name, hovered)}
            >
              <Image source={item.icon} style={{ width: theme.size.icon, height: theme.size.icon }} contentFit="contain" />
            </Touchable>
          ))}
        </ScrollView>
      </View>
    </KeepFocus>
  );
}

/** 表情包、贴纸的网格：每行 4 个，按所在区域的宽度均分 */
export function StickerGrid({ items, onPick }: { items: readonly Emoticon[]; onPick: (item: Emoticon) => void }) {
  return (
    <FlatList
      data={items}
      numColumns={STICKER_COLUMNS}
      keyExtractor={(item, index) => `${index}${item.src}`}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={styles.stickers}
      renderItem={({ item }) => (
        <Touchable accessibilityRole="button" accessibilityLabel={item.name} onPress={() => onPick(item)} style={({ pressed, hovered }) => styles.sticker(pressed, hovered)}>
          <View style={styles.stickerImage}>
            <Image source={item.src} recyclingKey={item.src} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="memory-disk" />
          </View>
        </Touchable>
      )}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1 },
  categories: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  category: (active: boolean, hovered: boolean) => ({
    width: theme.size.segment,
    height: theme.size.segment,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: active ? theme.colors.fill : hovered ? theme.colors.hover : undefined,
  }),
  // 底部留出删除键的高度，最后一行不被盖住
  emojiList: { paddingHorizontal: theme.spacing.sm, paddingBottom: theme.size.emojiCell + theme.spacing.md },
  emojiCell: (pressed: boolean, hovered: boolean) => ({
    flex: 1 / EMOJI_COLUMNS,
    height: theme.size.emojiCell,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.block,
    backgroundColor: pressed ? theme.colors.fillPressed : hovered ? theme.colors.hover : undefined,
  }),
  emoji: { ...theme.typography.emoji },
  delete: (pressed: boolean) => ({
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.sm,
    width: theme.size.control,
    height: theme.size.emojiCell,
    borderRadius: theme.radius.block,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pressed ? theme.colors.fillPressed : theme.colors.fill,
    boxShadow: theme.shadow.float,
  }),
  tabs: {
    flexDirection: 'row',
    height: theme.size.touch,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.separator,
  },
  tab: (active: boolean, hovered: boolean) => ({
    width: theme.size.control,
    height: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: active ? theme.colors.fill : hovered ? theme.colors.hover : undefined,
  }),
  stickers: { padding: theme.spacing.sm },
  sticker: (pressed: boolean, hovered: boolean) => ({
    width: `${100 / STICKER_COLUMNS}%`,
    aspectRatio: 1,
    padding: theme.spacing.xs,
    borderRadius: theme.radius.block,
    backgroundColor: pressed ? theme.colors.fillPressed : hovered ? theme.colors.hover : undefined,
  }),
  stickerImage: { flex: 1 },
}));
