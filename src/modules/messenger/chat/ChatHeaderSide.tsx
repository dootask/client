import { router } from 'expo-router';
import { ClockFading, MessageCirclePlus, Phone } from 'lucide-react-native';
import { Text, View, type StyleProp, type TextStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { aiModelLabel, aiQuickMsgs, type StoredDialog } from '../../../sync/messenger';
import { DialogAvatar, UserAvatar } from '../../../ui/Avatar';
import { IconButton } from '../../../ui/IconButton';
import { Menu } from '../../../ui/popover';
import { Touchable } from '../../../ui/Touchable';
import { useSession } from '../../session';
import { useMessenger, useMessengerState } from '../hooks';
import { AiSessionHistory } from './AiSessionHistory';
import { useCallPeer } from './extras';
import { useAiSession } from './useAiSession';

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

/** AI 会话导航栏副标题（同旧版 App）：当前模型名，点开菜单切换，当前项打勾；不是 AI 会话返回 null */
export function AiModelSubtitle({ dialog, style }: { dialog: StoredDialog; style: StyleProp<TextStyle> }) {
  const t = useT();
  const messenger = useMessenger();
  const selected = useMessengerState((s) => s.aiModels[dialog.id]);
  const item = aiQuickMsgs(dialog).find(({ key }) => key === '~ai-model-select');
  if (!item || !messenger) return null;
  const active = selected || item.config?.model;
  const items = (item.config?.models ?? []).map((model) => ({
    label: model.label,
    checked: model.value === active,
    onSelect: () => { if (model.value !== active) messenger.selectAiModel(dialog.id, model.value); },
  }));
  return (
    <Menu items={items} accessibilityLabel={t('messenger:ai.selectModel')}>
      <Text testID="ai-model-trigger" style={style} numberOfLines={1}>{aiModelLabel(item, selected)}</Text>
    </Menu>
  );
}

/** 有会话管理（新会话、历史）的 AI 会话，导航栏右侧换成 AiHeaderRight */
export const hasAiSessions = (dialog: StoredDialog) => aiQuickMsgs(dialog).some(({ key }) => key !== '~ai-model-select');

/** AI 会话导航栏右侧（同旧版 App，代替会话头像）：时钟 = 历史会话，气泡加号 = 开启新会话 */
export function AiHeaderRight({ dialog, onSessionChanged }: { dialog: StoredDialog; onSessionChanged: () => void }) {
  const t = useT();
  const session = useAiSession(dialog, onSessionChanged);
  const keys = aiQuickMsgs(dialog).map(({ key }) => key);
  return (
    <>
      {keys.includes('~ai-session-history') && <IconButton testID="ai-history" icon={ClockFading} label={t('messenger:ai.history')} onPress={session.openHistory} />}
      {keys.includes('~ai-session-create') && <IconButton testID="ai-new-session" icon={MessageCirclePlus} label={t('messenger:ai.newSession')} onPress={() => void session.create()} />}
      {session.history && <AiSessionHistory dialog={dialog} visible onClose={session.closeHistory} onChanged={onSessionChanged} />}
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
