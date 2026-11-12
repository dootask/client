import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { aiQuickMsgs, quickMsgs } from '../../../sync/messenger';
import type { Dialog } from '../../../sync/api/dialog';
import { QuickMsgItems } from './QuickMsgItems';

/**
 * 机器人单聊的快捷消息（旧版网页 .chat-bottom-menu）：输入框正上方一排 26 高的胶囊，点击直接发出对应指令；
 * 宽屏灰底、与输入框左右对齐，窄屏在浅灰输入条上用白底；没有悬停效果
 */
export function QuickMsgBar({ dialog, onSent }: { dialog: Dialog; onSent: () => void }) {
  if (quickMsgs(dialog).length + aiQuickMsgs(dialog).length === 0) return null;
  return (
    <ScrollView testID="ai-quickbar" horizontal showsHorizontalScrollIndicator={false} style={styles.bar} contentContainerStyle={styles.row}>
      <QuickMsgItems dialog={dialog} onSent={onSent} itemStyle={styles.item} labelStyle={styles.label} />
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme, rt) => {
  const c = theme.size.webComposer;
  const narrow = rt.breakpoint === 'xs';
  return {
    // 窄屏输入条自带上内边距，胶囊行下面不再留
    bar: { flexGrow: 0, backgroundColor: narrow ? theme.colors.webFooterNarrow : undefined },
    row: narrow
      ? { gap: c.quickGap, paddingHorizontal: c.padXNarrow, paddingTop: c.quickBarY }
      : { gap: c.quickGap, paddingHorizontal: c.padX, paddingVertical: c.quickBarY },
    item: {
      height: c.quick,
      maxWidth: theme.size.quickMsgMax,
      paddingHorizontal: c.quickPadX,
      borderRadius: theme.radius.pill,
      justifyContent: 'center',
      backgroundColor: narrow ? theme.colors.surface : theme.colors.webQuickMsg,
    },
    label: { ...theme.typography.webQuickMsg, color: theme.colors.regularText },
  };
});
