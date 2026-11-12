import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { Dialog } from '../../../sync/api/dialog';
import { aiQuickMsgs, quickMsgs } from '../../../sync/messenger';
import { QuickMsgItems } from './QuickMsgItems';

export function QuickMsgBar({ dialog, onSent }: { dialog: Dialog; onSent: () => void }) {
  const ai = aiQuickMsgs(dialog).length > 0;
  if (quickMsgs(dialog).length === 0 && !ai) return null;
  return <ScrollView testID="ai-quickbar" horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" style={styles.bar(ai)} contentContainerStyle={styles.row(ai)}>
    <QuickMsgItems dialog={dialog} onSent={onSent} itemStyle={styles.item} labelStyle={styles.label} quickStyle={({ pressed, hovered }) => styles.quick(pressed, hovered)} quickLabelStyle={styles.quickLabel} />
  </ScrollView>;
}

const styles = StyleSheet.create((theme) => ({
  bar: (ai: boolean) => ({ flexGrow: 0, backgroundColor: ai ? theme.colors.headerBg : undefined }),
  row: (ai: boolean) => ({ gap: ai ? theme.size.webComposer.quickGap : theme.spacing.sm, paddingHorizontal: theme.spacing.page, paddingTop: ai ? theme.size.webComposer.quickBarY : theme.spacing.sm, paddingBottom: ai ? theme.size.webComposer.quickBarY : 0 }),
  quick: (pressed: boolean, hovered: boolean) => ({ height: theme.size.chip, maxWidth: theme.size.quickMsgMax, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.pill, justifyContent: 'center', backgroundColor: pressed ? theme.colors.fillPressed : hovered ? theme.colors.fillButton : theme.colors.fill }),
  quickLabel: { ...theme.typography.footnote, color: theme.colors.text },
  item: { height: theme.size.webComposer.quick, maxWidth: theme.size.quickMsgMax, paddingHorizontal: theme.size.webComposer.quickPadX, borderRadius: theme.radius.pill, justifyContent: 'center', backgroundColor: theme.colors.surface },
  label: { ...theme.typography.webQuickMsg, color: theme.colors.regularText },
}));
