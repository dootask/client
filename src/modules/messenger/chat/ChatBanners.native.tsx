import { ChevronRight, X } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { StoredDialog } from '../../../sync/messenger';
import { msgPreview } from '../../../sync/messenger/preview';
import { Icon } from '../../../ui/Icon';
import { Confirm } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { useErrorText } from '../../session';
import { useMsgActions, useUser } from '../hooks';
import { PreviewText } from '../PreviewText';
import { useTopMsg } from './topMsg';

/**
 * 聊天页顶部的横条（同旧版 App）：置顶消息一行「发送人: 内容」，点了跳过去，× 确认后取消置顶；
 * 我在这个会话里还没完成的待办（点了跳到最早的一条）。两条左侧都有色条
 */
export function ChatBanners({ dialog, onJump }: { dialog: StoredDialog | undefined; onJump: (msgId: number) => void }) {
  if (!dialog) return null;
  const topId = dialog.top_msg_id ?? 0;
  const todoNum = dialog.todo_num ?? 0;
  if (!topId && !todoNum) return null;
  return (
    <View style={styles.root}>
      {topId > 0 && <TopBanner key={topId} dialogId={dialog.id} msgId={topId} pinnerId={dialog.top_userid ?? 0} onJump={onJump} />}
      {todoNum > 0 && <TodoBanner dialogId={dialog.id} count={todoNum} onJump={onJump} />}
    </View>
  );
}

function TopBanner({ dialogId, msgId, pinnerId, onJump }: { dialogId: number; msgId: number; pinnerId: number; onJump: (msgId: number) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const msg = useTopMsg(dialogId, msgId);
  const sender = useUser(msg?.userid ?? 0)?.nickname;
  const pinner = useUser(pinnerId)?.nickname;
  const preview = msgPreview(msg);

  return (
    <Touchable accessibilityRole="button" onPress={() => onJump(msgId)} style={({ pressed }) => styles.bar(pressed)}>
      <View style={styles.accent(theme.colors.primary)} />
      <Text style={styles.text} numberOfLines={1}>
        {!!sender && <Text style={styles.sender}>{sender}: </Text>}
        {preview ? <PreviewText preview={preview} /> : ' '}
      </Text>
      {msg && (
        <Confirm
          title={t('messenger:top.unpinConfirm')}
          message={pinner ? t('messenger:top.by', { name: pinner }) : undefined}
          accessibilityLabel={t('messenger:action.unpin')}
          onConfirm={() => void actions?.toggleTop(msg).catch((err) => showToast(errorText(err)))}
          style={({ pressed }) => styles.close(pressed)}
        >
          <Icon icon={X} color={theme.colors.text3} size={theme.size.bannerClose} />
        </Confirm>
      )}
    </Touchable>
  );
}

function TodoBanner({ dialogId, count, onJump }: { dialogId: number; count: number; onJump: (msgId: number) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const go = () => {
    actions
      ?.myTodos(dialogId)
      .then((list) => {
        const first = Math.min(...list.map((todo) => todo.msg_id));
        if (Number.isFinite(first)) onJump(first);
      })
      .catch((err) => showToast(errorText(err)));
  };
  return (
    <Touchable accessibilityRole="button" onPress={go} style={({ pressed }) => styles.bar(pressed)}>
      <View style={styles.accent(theme.colors.warning)} />
      <Text style={[styles.text, styles.strong]} numberOfLines={1}>{t('messenger:todos.mine', { n: count })}</Text>
      <Text style={styles.go}>{t('messenger:todos.go')}</Text>
      <Icon icon={ChevronRight} color={theme.colors.primaryText} size={theme.size.bannerClose} />
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  bar: (pressed: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    height: theme.size.banner,
    paddingHorizontal: theme.spacing.page,
    backgroundColor: pressed ? theme.colors.fillPressed : 'transparent',
  }),
  accent: (color: string) => ({
    width: theme.size.bannerAccent,
    alignSelf: 'stretch',
    marginVertical: theme.spacing.sm,
    borderRadius: theme.radius.swatch,
    backgroundColor: color,
  }),
  text: { ...theme.typography.footnote, flex: 1, color: theme.colors.text },
  strong: { ...theme.typography.footnoteStrong },
  sender: { ...theme.typography.footnoteStrong, color: theme.colors.primaryText },
  go: { ...theme.typography.footnoteStrong, color: theme.colors.primaryText },
  close: (pressed: boolean) => ({ opacity: pressed ? theme.opacity.pressedIcon : 1 }),
}));
