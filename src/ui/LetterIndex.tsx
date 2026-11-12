import { memo, useCallback, useRef } from 'react';
import { type GestureResponderEvent, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '../platform/haptics';

export const LetterIndex = memo(function LetterIndex({ letters, onSelect }: { letters: readonly string[]; onSelect: (letter: string) => void }) {
  const { theme } = useUnistyles();
  const last = useRef('');
  const onLetter = useCallback((event: GestureResponderEvent) => {
    const index = Math.max(0, Math.min(letters.length - 1, Math.floor(event.nativeEvent.locationY / theme.size.pickLetter)));
    const letter = letters[index];
    if (!letter || last.current === letter) return;
    last.current = letter;
    onSelect(letter);
    haptics.selection();
  }, [letters, onSelect, theme.size.pickLetter]);
  if (letters.length < 2) return null;
  return (
    <View style={styles.index} pointerEvents="box-none">
      <View onStartShouldSetResponder={() => true} onResponderGrant={onLetter} onResponderMove={onLetter} onResponderRelease={() => { last.current = ''; }} onResponderTerminate={() => { last.current = ''; }}>
        <View pointerEvents="none">
          {letters.map((letter) => <Text key={letter} style={styles.letter} allowFontScaling={false}>{letter}</Text>)}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  index: { position: 'absolute', right: theme.size.pickLetterInset, top: 0, bottom: 0, width: theme.size.pickLetterWidth, justifyContent: 'center', alignItems: 'center' },
  letter: { ...theme.typography.caption2, height: theme.size.pickLetter, lineHeight: theme.size.pickLetter, width: theme.size.pickLetterWidth, textAlign: 'center', color: theme.colors.primaryText },
}));
