import { Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Touchable } from '../../../ui/Touchable';
import type { BubbleTone } from './RichText';

/** 网页长文气泡底部的「查看详情」（同旧版网页 .content-longtext-footer）：上方细线，居中，点了在新标签页打开阅读页 */
export function LongMore({ msgId, tone }: { msgId?: number; tone: BubbleTone }) {
  const t = useT();
  return (
    <Touchable accessibilityRole="link" disabled={!msgId} onPress={() => void window.open(`/msg-detail/${msgId}`)} style={styles.footer}>
      <Text style={[styles.text, { color: tone.text }]}>{t('messenger:long.viewDetail')}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => {
  const m = theme.size.markdown;
  return {
    footer: { marginTop: m.longTop, marginBottom: -m.longPull, borderTopWidth: 1, borderTopColor: theme.colors.longLine, cursor: 'pointer' },
    text: { ...theme.typography.mdLongMore, padding: m.longPad, textAlign: 'center' },
  };
});
