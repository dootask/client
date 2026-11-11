import { ScrollView, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { quickMsgs, quickMsgHtml } from '../../../sync/messenger';
import type { Dialog } from '../../../sync/api/dialog';
import { Touchable } from '../../../ui/Touchable';
import { useMessenger } from '../hooks';

/** B7 机器人单聊的快捷消息：输入栏上方横排胶囊，点按直接发出对应指令 */
export function QuickMsgBar({ dialog, onSent }: { dialog: Dialog; onSent: () => void }) {
  const messenger = useMessenger();
  const items = quickMsgs(dialog);
  if (!messenger || items.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" style={styles.bar} contentContainerStyle={styles.row}>
      {items.map((item) => (
        <Touchable
          key={item.key}
          accessibilityRole="button"
          onPress={() => {
            messenger.sendText({ dialog_id: dialog.id, text: quickMsgHtml(item) });
            onSent();
          }}
          style={({ pressed, hovered }) => styles.item(pressed, hovered)}
        >
          <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
        </Touchable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  bar: { flexGrow: 0 },
  row: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.page,
    paddingTop: theme.spacing.sm,
  },
  item: (pressed: boolean, hovered: boolean) => ({
    height: theme.size.chip,
    maxWidth: theme.size.quickMsgMax,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    backgroundColor: pressed ? theme.colors.fillPressed : hovered ? theme.colors.fillButton : theme.colors.fill,
  }),
  label: { ...theme.typography.footnote, color: theme.colors.text },
}));
