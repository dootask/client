import { ChevronRight, ListTodo, Pin, X } from 'lucide-react-native';
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
 * 聊天页顶部的横条：置顶消息（点了跳过去，× 取消置顶）、我在这个会话里还没完成的待办（点了跳到最早的一条）
 */
export function ChatBanners({ dialog, onJump }: { dialog: StoredDialog | undefined; onJump: (msgId: number) => void }) {
  if (!dialog) return null;
  const topId = dialog.top_msg_id ?? 0;
  const todoNum = dialog.todo_num ?? 0;
  if (!topId && !todoNum) return null;
  return (
    <View style={styles.root}>
      {topId > 0 && <TopBanner key={topId} dialogId={dialog.id} msgId={topId} userid={dialog.top_userid ?? 0} onJump={onJump} />}
      {todoNum > 0 && <TodoBanner dialogId={dialog.id} count={todoNum} onJump={onJump} />}
    </View>
  );
}

function TopBanner({ dialogId, msgId, userid, onJump }: { dialogId: number; msgId: number; userid: number; onJump: (msgId: number) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const user = useUser(userid);
  const msg = useTopMsg(dialogId, msgId);
  const preview = msgPreview(msg);

  return (
    <View style={styles.bar}>
      <Touchable accessibilityRole="button" onPress={() => onJump(msgId)} style={({ pressed, hovered }) => styles.main(pressed, hovered)}>
        <Icon icon={Pin} color={theme.colors.primaryText} size={theme.size.iconSmall} />
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {preview ? <PreviewText preview={preview} /> : ' '}
          </Text>
          {!!user?.nickname && (
            <Text style={styles.sub} numberOfLines={1}>
              {t('messenger:top.by', { name: user.nickname })}
            </Text>
          )}
        </View>
      </Touchable>
      {msg && (
        <Confirm
          title={t('messenger:top.unpinConfirm')}
          confirmLabel={t('messenger:action.unpin')}
          destructive
          accessibilityLabel={t('messenger:action.unpin')}
          onConfirm={() => void actions?.toggleTop(msg).catch((err) => showToast(errorText(err)))}
          style={({ pressed, hovered }) => styles.side(pressed, hovered)}
        >
          <Icon icon={X} color={theme.colors.text3} size={theme.size.iconSmall} />
        </Confirm>
      )}
    </View>
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
    <Touchable accessibilityRole="button" onPress={go} style={({ pressed, hovered }) => [styles.bar, styles.main(pressed, hovered)]}>
      <Icon icon={ListTodo} color={theme.colors.warning} size={theme.size.iconSmall} />
      <Text style={[styles.title, styles.text]} numberOfLines={1}>
        {t('messenger:todos.mine', { n: count })}
      </Text>
      <Text style={styles.go}>{t('messenger:todos.go')}</Text>
      <Icon icon={ChevronRight} color={theme.colors.primaryText} size={theme.size.iconSmall} />
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: theme.size.rowSingle },
  main: (pressed: boolean, hovered: boolean) => ({
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    alignSelf: 'stretch',
    paddingHorizontal: theme.spacing.page,
    backgroundColor: pressed ? theme.colors.fillPressed : hovered ? theme.colors.hover : 'transparent',
  }),
  text: { flex: 1, minWidth: 0 },
  title: { ...theme.typography.subhead, color: theme.colors.text },
  sub: { ...theme.typography.caption, color: theme.colors.text3 },
  go: { ...theme.typography.subhead, color: theme.colors.primaryText },
  side: (pressed: boolean, hovered: boolean) => ({
    width: theme.size.touch,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: pressed ? theme.opacity.pressedIcon : 1,
    backgroundColor: hovered ? theme.colors.hover : 'transparent',
  }),
}));
