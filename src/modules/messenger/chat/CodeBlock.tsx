import * as Clipboard from 'expo-clipboard';
import { Copy } from 'lucide-react-native';
import { useContext, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Icon } from '../../../ui/Icon';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { RichHandlersContext, type BubbleTone } from './RichText';
import { rowTraits } from './rowTraits';

/** 代码块（同旧版 App）：children 是显示的内容（页内查找时带高亮），复制的是 text；浅底、横向滚动，右上角复制按钮，复制后提示 */
export function CodeBlock({ text, tone, children }: { lang: string; text: string; tone: BubbleTone; children: ReactNode }) {
  const t = useT();
  const { theme } = useUnistyles();
  const { selectable } = useContext(RichHandlersContext);
  return (
    <View style={[styles.code, { backgroundColor: tone.overlay }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text selectable={rowTraits.selectableText || selectable} style={[styles.text, { color: tone.text }]}>{children}</Text>
      </ScrollView>
      <Touchable
        hitSlop={theme.spacing.sm}
        accessibilityRole="button"
        accessibilityLabel={t('messenger:chat.copy')}
        onPress={() => {
          Clipboard.setStringAsync(text)
            .then(() => showToast(t('messenger:chat.copied')))
            .catch(() => {});
        }}
        style={({ pressed }) => [styles.copy, { backgroundColor: tone.overlay }, pressed && styles.pressed]}
      >
        <Icon icon={Copy} color={tone.muted} size={theme.size.iconSmall} />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  code: { borderRadius: theme.radius.bubbleTight, overflow: 'hidden' },
  text: { ...theme.typography.code, padding: theme.spacing.sm, paddingRight: theme.spacing.xxl + theme.spacing.sm },
  copy: { position: 'absolute', top: theme.spacing.xs, right: theme.spacing.xs, padding: theme.spacing.xs, borderRadius: theme.radius.bubbleTight },
  pressed: { opacity: theme.opacity.pressedIcon },
}));
