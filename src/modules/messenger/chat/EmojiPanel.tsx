import { ScrollView, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Touchable } from '../../../ui/Touchable';
import { EMOJIS } from './emoji';

/** 表情面板：点一个插到光标处 */
export function EmojiPanel({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.grid} keyboardShouldPersistTaps="always">
      {EMOJIS.map((emoji) => (
        <Touchable key={emoji} accessibilityRole="button" accessibilityLabel={emoji} onPress={() => onPick(emoji)} style={({ pressed, hovered }) => styles.cell(pressed, hovered)}>
          <Text style={styles.emoji} allowFontScaling={false}>{emoji}</Text>
        </Touchable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: theme.spacing.sm },
  cell: (pressed: boolean, hovered: boolean) => ({
    width: '12.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.block,
    backgroundColor: pressed ? theme.colors.fillPressed : hovered ? theme.colors.hover : undefined,
  }),
  emoji: { ...theme.typography.emoji },
}));
