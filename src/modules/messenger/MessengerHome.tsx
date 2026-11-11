import { MessagesSquare } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { Icon } from '../../ui/Icon';
import { useSplitView } from '../../ui/layout';
import { DialogList } from './DialogList';

/** 消息首页：窄屏是会话列表；并排视图里列表在左边，右边同旧版：灰圆里的消息图标 + 灰色胶囊提示 */
export function MessengerHome() {
  const t = useT();
  const { theme } = useUnistyles();
  const split = useSplitView();
  if (!split) return <DialogList />;
  return (
    <View style={styles.root}>
      <View style={styles.circle}>
        <Icon icon={MessagesSquare} size={theme.size.emptyIcon} color={theme.colors.emptyIcon} />
      </View>
      <Text style={styles.pill}>{t('messenger:pick')}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  circle: {
    padding: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.emptyFill,
  },
  pill: {
    ...theme.typography.emptyPill,
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.size.emptyPillPadX,
    borderRadius: theme.radius.emptyPill,
    overflow: 'hidden',
    color: theme.colors.emptyText,
    backgroundColor: theme.colors.emptyFill,
  },
}));
