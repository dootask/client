import { Image } from 'expo-image';
import { FlatList, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { Emoticon } from '../../../sync/messenger';
import { Touchable } from '../../../ui/Touchable';

const STICKER_COLUMNS = 4;

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
