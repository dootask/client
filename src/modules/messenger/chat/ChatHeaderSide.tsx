import { router } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { StoredDialog } from '../../../sync/messenger';
import { DialogAvatar, UserAvatar } from '../../../ui/Avatar';
import { IconButton } from '../../../ui/IconButton';
import { Touchable } from '../../../ui/Touchable';
import { useSession } from '../../session';
import { useCallPeer } from './extras';

type Tone = 'default' | 'success' | 'danger';

/**
 * 标题旁的标签（同旧版 App）：机器人 / 部门 / 全员在前，项目、任务群的已完成、已删除、已归档在后
 */
export function HeaderTags({ dialog }: { dialog: StoredDialog }) {
  const t = useT();
  const tags: { text: string; tone: Tone }[] = [];
  if (dialog.type === 'user' && dialog.bot) tags.push({ text: t('messenger:tag.bot'), tone: 'default' });
  if (dialog.type === 'group' && dialog.group_type === 'department') tags.push({ text: t('messenger:tag.department'), tone: 'default' });
  if (dialog.type === 'group' && dialog.group_type === 'all') tags.push({ text: t('messenger:tag.all'), tone: 'default' });
  const info = dialog.group_info;
  if (dialog.type === 'group' && (dialog.group_type === 'project' || dialog.group_type === 'task') && info) {
    if (dialog.group_type === 'task' && info.complete_at) tags.push({ text: t('messenger:tag.completed'), tone: 'success' });
    if (info.deleted_at) tags.push({ text: t('messenger:tag.deleted'), tone: 'danger' });
    else if (info.archived_at) tags.push({ text: t('messenger:tag.archived'), tone: 'default' });
  }
  return tags.map((tag) => (
    <View key={tag.text} style={styles.tag(tag.tone)}>
      <Text style={styles.tagText(tag.tone)} numberOfLines={1}>{tag.text}</Text>
    </View>
  ));
}

/** 导航栏右侧（同旧版 App）：能打电话的单聊先是电话按钮，再是会话头像 */
export function HeaderRight({ dialog }: { dialog: StoredDialog }) {
  const t = useT();
  const { theme } = useUnistyles();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const callPeer = useCallPeer(dialog, userId);
  return (
    <>
      {callPeer && <IconButton icon={Phone} label={t('messenger:call.entry')} onPress={callPeer} />}
      <Touchable style={styles.avatar} accessibilityLabel={t('messenger:group.info.title')} onPress={() => router.push({ pathname: '/messenger/info/[dialogId]', params: { dialogId: dialog.id } })}>
        {dialog.type === 'user'
          ? <UserAvatar uri={dialog.userimg} userid={dialog.dialog_user?.userid ?? 0} name={dialog.name ?? ''} bot={!!dialog.bot} size={theme.size.headerAvatar} />
          : <DialogAvatar uri={dialog.avatar} groupType={dialog.group_type} size={theme.size.headerAvatar} />}
      </Touchable>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  tag: (tone: Tone) => ({
    paddingHorizontal: theme.size.headerTagPadX,
    paddingVertical: theme.size.headerTagPadY,
    borderRadius: theme.radius.headerTag,
    backgroundColor: tone === 'success' ? theme.colors.tagSuccessFill : tone === 'danger' ? theme.colors.tagDangerFill : theme.colors.fill,
  }),
  tagText: (tone: Tone) => ({
    ...theme.typography.caption2,
    color: tone === 'success' ? theme.colors.primary : tone === 'danger' ? theme.colors.danger : theme.colors.text3,
  }),
  avatar: { width: theme.size.touch, height: theme.size.touch, alignItems: 'center', justifyContent: 'center' },
}));
