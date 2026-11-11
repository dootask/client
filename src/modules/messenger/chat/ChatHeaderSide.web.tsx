import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { StoredDialog } from '../../../sync/messenger';
import { DialogAvatar, UserAvatar } from '../../../ui/Avatar';

/** 标题旁的标签：已删除 / 已归档 */
export function HeaderTags({ dialog }: { dialog: StoredDialog }) {
  const t = useT();
  const info = dialog.group_info;
  if (info?.deleted_at) return <Tag text={t('messenger:tag.deleted')} danger />;
  if (info?.archived_at) return <Tag text={t('messenger:tag.archived')} />;
  return null;
}

/** 导航栏右侧：会话头像 */
export function HeaderRight({ dialog }: { dialog: StoredDialog }) {
  const { theme } = useUnistyles();
  return dialog.type === 'user'
    ? <UserAvatar uri={dialog.userimg} userid={dialog.dialog_user?.userid ?? 0} name={dialog.name ?? ''} bot={!!dialog.bot} size={theme.size.avatar.md} />
    : <DialogAvatar uri={dialog.avatar} groupType={dialog.group_type} size={theme.size.avatar.md} />;
}

function Tag({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <View style={styles.tag(danger)}>
      <Text style={styles.tagText(danger)} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  tag: (danger: boolean) => ({
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.bubbleTight,
    backgroundColor: danger ? theme.colors.danger : theme.colors.fill,
  }),
  tagText: (danger: boolean) => ({
    ...theme.typography.caption2,
    color: danger ? theme.colors.onPrimary : theme.colors.text2,
  }),
}));
