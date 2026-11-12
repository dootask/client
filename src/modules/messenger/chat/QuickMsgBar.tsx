import { ScrollView, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { Dialog } from '../../../sync/api/dialog';
import { quickMsgHtml, quickMsgs } from '../../../sync/messenger';
import { Touchable } from '../../../ui/Touchable';
import { useMessenger } from '../hooks';

/** App 机器人单聊的快捷指令：输入框上方一排胶囊，点按直接发出（AI 会话的模型、新会话、历史在导航栏，同旧版 App） */
export function QuickMsgBar({ dialog, onSent }: { dialog: Dialog; onSent: () => void }) {
  const messenger = useMessenger();
  const items = quickMsgs(dialog);
  if (!messenger || items.length === 0) return null;
  return (
    <ScrollView testID="ai-quickbar" horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" style={styles.bar} contentContainerStyle={styles.row}>
      {items.map((item) => (
        <Touchable key={item.key} accessibilityRole="button" style={({ pressed }) => styles.quick(pressed)} onPress={() => { messenger.sendText({ dialog_id: dialog.id, text: quickMsgHtml(item) }); onSent(); }}>
          <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
        </Touchable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  bar: { flexGrow: 0 },
  row: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.page, paddingTop: theme.spacing.sm },
  quick: (pressed: boolean) => ({ height: theme.size.chip, maxWidth: theme.size.quickMsgMax, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.pill, justifyContent: 'center', backgroundColor: pressed ? theme.colors.fillPressed : theme.colors.fill }),
  label: { ...theme.typography.footnote, color: theme.colors.text },
}));
