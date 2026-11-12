import { router } from 'expo-router';
import { ChevronRight, Sigma } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Icon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import type { BubbleTone } from './RichText';

/** App 的公式（同旧版 App）：原生文字排不了公式，气泡里是一张卡片（标题和一行源码），点了进查看页 */
export function MathBlock({ text, tone }: { text: string; tone: BubbleTone }) {
  const t = useT();
  const { theme } = useUnistyles();
  return (
    <Touchable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/math', params: { source: text } })}
      style={({ pressed }) => [styles.card, { backgroundColor: tone.overlay }, pressed && styles.pressed]}
    >
      <Icon icon={Sigma} color={tone.accent} size={theme.size.mathIcon} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: tone.text }]}>{t('messenger:math.title')}</Text>
        <Text style={[styles.source, { color: tone.muted }]} numberOfLines={1}>{text}</Text>
      </View>
      <Icon icon={ChevronRight} color={tone.muted} size={theme.size.iconSmall} />
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: theme.radius.bubbleTight },
  pressed: { opacity: theme.opacity.pressedIcon },
  body: { flexShrink: 1 },
  title: theme.typography.subhead,
  source: theme.typography.mathSource,
}));
