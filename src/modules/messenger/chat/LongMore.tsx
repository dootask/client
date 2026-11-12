import { Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { BubbleTone } from './RichText';

/** App 长文气泡底部的「查看全文」（同旧版 App）：点整个气泡进阅读页 */
export function LongMore({ tone }: { msgId?: number; tone: BubbleTone }) {
  const t = useT();
  return <Text style={[styles.more, { color: tone.link }]}>{t('messenger:chat.viewFull')}</Text>;
}

const styles = StyleSheet.create((theme) => ({
  more: { ...theme.typography.footnote, marginTop: theme.spacing.sm },
}));
