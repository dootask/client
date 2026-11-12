import { Image } from 'expo-image';
import { Delete, Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { emojiGroups, emoticonPacks, type EmojiCategory, type Emoticon, type EmoticonPack } from '../../../sync/messenger';
import { KeepFocus } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import { CATEGORY_ICONS } from './emoji';

/**
 * 表情面板（Web，照旧版网页）：宽屏放在输入栏的浮层里（376 宽），窄屏内嵌在输入栏下方。
 * 上面是 emoji 分类栏和格子（点了插到光标处），底部切换 emoji 和各套表情包（点了直接发送）；最左是搜索在线贴纸。
 * 窄屏右下有删除键。origin 是服务器根地址（带结尾的 /）
 */
export function EmojiPanel({ origin, onInsert, onDelete, onSend, onSearch }: {
  origin: string;
  onInsert: (emoji: string) => void;
  onDelete: () => void;
  onSend: (item: Emoticon) => void;
  onSearch: () => void;
}) {
  const t = useT();
  const { theme, rt } = useUnistyles();
  const narrow = rt.breakpoint === 'xs';
  const { webEmoji } = theme.size;
  const columns = narrow ? webEmoji.columnsNarrow : webEmoji.columns;
  const cell = narrow ? webEmoji.cellNarrow : webEmoji.cell;
  const packs = emoticonPacks(origin);
  const [category, setCategory] = useState<EmojiCategory>('p');
  /** 选中的表情包；null 是 emoji */
  const [pack, setPack] = useState<EmoticonPack | null>(null);
  const emojis = emojiGroups().find((group) => group.type === category)?.emojis ?? [];
  const stickerColumns = narrow ? webEmoji.stickerColumnsNarrow : webEmoji.stickerColumns;

  return (
    <KeepFocus testID="emoji-panel" style={styles.root}>
      <View style={styles.box}>
        {pack ? (
          <FlatList
            key={`${pack.name}-${stickerColumns}`}
            data={pack.items}
            numColumns={stickerColumns}
            keyExtractor={(item, index) => `${index}${item.src}`}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <Touchable accessibilityRole="button" accessibilityLabel={item.name} onPress={() => onSend(item)} style={styles.sticker(stickerColumns)}>
                <View style={styles.stickerImage}>
                  <Image source={item.src} recyclingKey={item.src} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="memory-disk" />
                </View>
              </Touchable>
            )}
          />
        ) : (
          <>
            <View style={styles.nav}>
              {emojiGroups().map(({ type }) => (
                <Touchable key={type} accessibilityRole="button" accessibilityLabel={type} onPress={() => setCategory(type)} style={styles.navItem(type === category)}>
                  <Icon icon={CATEGORY_ICONS[type]} color={type === category ? theme.colors.primary : theme.colors.emojiNavIcon} size={webEmoji.navIcon} />
                </Touchable>
              ))}
            </View>
            <FlatList
              key={`${category}-${columns}`}
              data={emojis}
              numColumns={columns}
              keyExtractor={(emoji, index) => `${index}${emoji}`}
              initialNumToRender={columns * 8}
              getItemLayout={(_, index) => ({ length: cell, offset: cell * Math.floor(index / columns), index })}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => (
                <Touchable accessibilityRole="button" accessibilityLabel={item} onPress={() => onInsert(item)} style={({ pressed }) => styles.emojiCell(columns, pressed)}>
                  <Text allowFontScaling={false} style={styles.emoji}>{item}</Text>
                </Touchable>
              )}
            />
            {narrow && (
              <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:chat.delete')} onPress={onDelete} style={styles.delete}>
                <Icon icon={Delete} color={theme.colors.text2} size={webEmoji.deleteIcon} />
              </Touchable>
            )}
          </>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menu} contentContainerStyle={styles.menuContent}>
        <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:chat.searchSticker')} onPress={onSearch} style={styles.menuItem(false)}>
          <Icon icon={Search} color={theme.colors.emojiNavIcon} size={webEmoji.navIcon} />
        </Touchable>
        <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:chat.emoji')} onPress={() => setPack(null)} style={styles.menuItem(!pack)}>
          <Text allowFontScaling={false} style={styles.menuEmoji}>😀</Text>
        </Touchable>
        {packs.map((item) => (
          <Touchable key={item.name} accessibilityRole="button" accessibilityLabel={item.name} onPress={() => setPack(item)} style={styles.menuItem(pack?.name === item.name)}>
            <Image source={item.icon} style={{ width: webEmoji.menuIcon, height: webEmoji.menuIcon }} contentFit="contain" />
          </Touchable>
        ))}
      </ScrollView>
    </KeepFocus>
  );
}

// expo-image 不是 unistyles 接管的组件，Web 上收不到 StyleSheet 生成的样式，尺寸直接传

const styles = StyleSheet.create((theme, rt) => {
  const { webEmoji } = theme.size;
  const narrow = rt.breakpoint === 'xs';
  return {
    root: narrow ? { flex: 1, backgroundColor: theme.colors.surface } : { width: webEmoji.width },
    box: narrow ? { flex: 1 } : { height: webEmoji.height },
    nav: { flexDirection: 'row', justifyContent: 'space-around', height: webEmoji.nav, backgroundColor: theme.colors.emojiNav },
    // 选中的分类是白底上圆角的小页签
    navItem: (active: boolean) => ({
      width: webEmoji.navItem,
      height: webEmoji.nav,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopLeftRadius: theme.radius.menu,
      borderTopRightRadius: theme.radius.menu,
      backgroundColor: active ? theme.colors.surface : undefined,
    }),
    grid: { padding: webEmoji.pad },
    emojiCell: (columns: number, pressed: boolean) => ({
      width: `${100 / columns}%`,
      height: narrow ? webEmoji.cellNarrow : webEmoji.cell,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.menu * 2,
      backgroundColor: pressed ? theme.colors.fillPressed : undefined,
    }),
    emoji: narrow ? theme.typography.webEmojiNarrow : theme.typography.webEmoji,
    sticker: (columns: number) => ({ width: `${100 / columns}%`, aspectRatio: 1, padding: webEmoji.stickerPad }),
    stickerImage: { flex: 1 },
    delete: {
      position: 'absolute',
      right: webEmoji.deleteRight,
      bottom: webEmoji.deleteRight,
      paddingVertical: webEmoji.deletePadY,
      paddingHorizontal: webEmoji.deletePadX,
      borderRadius: theme.radius.menu * 2,
      backgroundColor: theme.colors.fillPressed,
    },
    menu: {
      flexGrow: 0,
      height: narrow ? webEmoji.menuNarrow : webEmoji.menu,
      backgroundColor: narrow ? theme.colors.emojiNav : theme.colors.emojiMenu,
    },
    menuContent: narrow ? { padding: webEmoji.menuPadNarrow } : {},
    menuItem: (active: boolean) => ({
      height: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: webEmoji.menuItemPad,
      borderRadius: narrow ? theme.radius.menu : 0,
      backgroundColor: active ? (narrow ? theme.colors.fillPressed : theme.colors.surface) : undefined,
    }),
    menuEmoji: theme.typography.webEmoji,
  };
});
