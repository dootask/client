import { LogOut, MessageSquareText, Pin, SquareCheck, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { MyTodo } from '../../../sync/api/dialog';
import type { StoredDialog } from '../../../sync/messenger';
import { msgContent } from '../../../sync/messenger/body/content';
import { msgPreview } from '../../../sync/messenger/preview';
import { UserAvatar } from '../../../ui/Avatar';
import { Icon } from '../../../ui/Icon';
import { Sheet, useSplitView } from '../../../ui/layout';
import { Confirm } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { useErrorText, useSession } from '../../session';
import { useMsgActions, useUser } from '../hooks';
import { PreviewText } from '../PreviewText';
import { MessageBody } from './MessageBody';
import { bubbleTones } from './bubbleTones';
import { useMsgFilter } from './msgTypes';
import { useTopMsg } from './topMsg';

/**
 * Web 聊天页顶部（同旧版网页）：不筛选时显示置顶消息卡片；筛「待办」时显示我未完成的待办条，点一项在右侧抽屉里看、完成
 */
export function ChatBanners({ dialog, onJump }: { dialog: StoredDialog | undefined; onJump: (msgId: number) => void }) {
  const filter = useMsgFilter(dialog?.id);
  if (!dialog) return null;
  const topId = dialog.top_msg_id ?? 0;
  if (filter === null && topId > 0) return <TopCard key={topId} dialogId={dialog.id} msgId={topId} pinnerId={dialog.top_userid ?? 0} onJump={onJump} />;
  if (filter === 'todo' && (dialog.todo_num ?? 0) > 0) return <TodoStrip dialogId={dialog.id} todoNum={dialog.todo_num ?? 0} onJump={onJump} />;
  return null;
}

/** 置顶消息卡片：橙色图钉、发送人和摘要、置顶人员；点卡片或定位键跳到原文，× 确认后取消置顶 */
function TopCard({ dialogId, msgId, pinnerId, onJump }: { dialogId: number; msgId: number; pinnerId: number; onJump: (msgId: number) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const msg = useTopMsg(dialogId, msgId);
  const sender = useUser(msg?.userid ?? 0)?.nickname;
  const pinner = useUser(pinnerId)?.nickname;
  const preview = msgPreview(msg);
  return (
    <View style={styles.topWrap}>
      <View testID="chat-top" style={styles.topCard}>
        <Touchable accessibilityRole="button" onPress={() => onJump(msgId)} style={styles.topJump}>
          <View style={styles.pinCell}>
            <View style={styles.pin}>
              <Icon icon={Pin} color={theme.colors.onPrimary} size={theme.size.topPin} />
            </View>
          </View>
          <View style={styles.topBody}>
            <Text style={styles.topContent} numberOfLines={1}>
              {!!sender && `${sender}: `}
              {preview ? <PreviewText preview={preview} /> : ' '}
            </Text>
            <Text style={styles.pinner} numberOfLines={1}>
              {t('messenger:top.pinner')}
              {!!pinner && <Text style={styles.pinnerName}>{pinner}</Text>}
            </Text>
          </View>
          <View style={[styles.topAction, styles.topLocate]}>
            <Icon icon={MessageSquareText} color={theme.colors.regularText} size={theme.size.topAction} />
          </View>
        </Touchable>
        <View style={styles.topActions}>
          {msg && (
            <Confirm
              title={t('messenger:top.unpinConfirm')}
              accessibilityLabel={t('messenger:action.unpin')}
              onConfirm={() => void actions?.toggleTop(msg).catch((err) => showToast(errorText(err)))}
              style={({ hovered }) => [styles.topAction, hovered && styles.topActionHover]}
            >
              <Icon icon={X} color={theme.colors.regularText} size={theme.size.topAction} />
            </Confirm>
          )}
        </View>
      </View>
    </View>
  );
}

/** 待办条：「我有 n 条未完成」和可横向滚动的摘要胶囊；条数跟着会话的 todo_num 变，变了重新拉列表 */
function TodoStrip({ dialogId, todoNum, onJump }: { dialogId: number; todoNum: number; onJump: (msgId: number) => void }) {
  const t = useT();
  const wide = useSplitView();
  const actions = useMsgActions();
  const [todos, setTodos] = useState<MyTodo[]>([]);
  const [viewing, setViewing] = useState<MyTodo | null>(null);
  const close = useCallback(() => setViewing(null), []);
  useEffect(() => {
    let alive = true;
    actions
      ?.myTodos(dialogId)
      .then((list) => alive && setTodos(list))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [actions, dialogId, todoNum]);
  if (todos.length === 0) return null;
  return (
    <View style={styles.strip(wide)}>
      <Text style={styles.stripLabel}>{t('messenger:todos.mine', { n: todos.length })}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipsContent}>
        {todos.map((todo) => (
          <TodoChip key={todo.id} dialogId={dialogId} todo={todo} onPress={() => setViewing(todo)} />
        ))}
      </ScrollView>
      {viewing && <TodoView dialogId={dialogId} todo={viewing} onClose={close} onJump={onJump} />}
    </View>
  );
}

function TodoChip({ dialogId, todo, onPress }: { dialogId: number; todo: MyTodo; onPress: () => void }) {
  const preview = msgPreview(useTopMsg(dialogId, todo.msg_id));
  return (
    <Touchable accessibilityRole="button" onPress={onPress} style={styles.chip}>
      <Text style={styles.chipText} numberOfLines={1}>
        {preview ? <PreviewText preview={preview} /> : ' '}
      </Text>
    </Touchable>
  );
}

/** 待办消息抽屉（同旧版网页）：这条消息、「回到原文」跳过去，底部「完成」 */
function TodoView({ dialogId, todo, onClose, onJump }: { dialogId: number; todo: MyTodo; onClose: () => void; onJump: (msgId: number) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const server = useSession((s) => s.server);
  const msg = useTopMsg(dialogId, todo.msg_id);
  const sender = useUser(msg?.userid ?? 0);
  const [busy, setBusy] = useState(false);
  const done = () => {
    setBusy(true);
    actions
      ?.done(todo.id, dialogId)
      .then(onClose)
      .catch((err) => showToast(errorText(err)))
      .finally(() => setBusy(false));
  };
  const tone = bubbleTones(theme).peer;
  return (
    <Sheet visible wide="right" fill onClose={onClose} title={t('messenger:todos.viewTitle')}>
      <ScrollView style={styles.viewScroll} contentContainerStyle={styles.viewContent}>
        {msg ? (
          <>
            <View style={styles.viewMsg}>
              <UserAvatar uri={sender?.userimg} userid={msg.userid} name={sender?.nickname ?? ''} size={theme.size.avatar.md} />
              <View style={styles.viewMain}>
                <Text style={styles.viewName} numberOfLines={1}>{sender?.nickname ?? ' '}</Text>
                <View style={styles.viewBubble}>
                  <MessageBody body={msgContent(msg, { userId, origin: `${server}/` }).body} tone={tone} />
                </View>
              </View>
            </View>
            <Touchable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                onJump(todo.msg_id);
              }}
              style={({ hovered }) => [styles.original, hovered && styles.originalHover]}
            >
              <Icon icon={LogOut} color={theme.colors.regularText} size={theme.size.iconTiny} />
              <Text style={styles.originalText}>{t('messenger:todos.backToOriginal')}</Text>
            </Touchable>
          </>
        ) : (
          <ActivityIndicator color={theme.colors.text3} style={styles.viewLoading} />
        )}
      </ScrollView>
      <View style={styles.viewFooter}>
        <Touchable accessibilityRole="button" disabled={busy} onPress={done} style={({ hovered }) => styles.doneButton(hovered)}>
          {busy ? <ActivityIndicator size="small" color={theme.colors.onPrimary} /> : <Icon icon={SquareCheck} color={theme.colors.onPrimary} size={theme.size.iconTiny} />}
          <Text style={styles.doneText}>{t('messenger:todos.complete')}</Text>
        </Touchable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  topWrap: { backgroundColor: theme.colors.surface },
  topCard: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm + 2,
    marginHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.size.topPinPad,
    borderRadius: theme.radius.topCard,
    borderWidth: 1,
    borderColor: theme.colors.topCardLine,
    boxShadow: `0 0 5px 0 ${theme.colors.topCardShadow}`,
    cursor: 'pointer',
  },
  // 图钉圆不在格里垂直居中，离顶 2（旧版行内图标的位置）
  pinCell: { height: theme.size.topPinCell, paddingTop: theme.size.topPinTop, paddingHorizontal: theme.spacing.sm + 2 },
  pin: { padding: theme.size.topPinPad, borderRadius: theme.radius.pill, backgroundColor: theme.colors.topPin },
  topJump: { flex: 1, minWidth: 0, flexDirection: 'row' },
  topBody: { flex: 1, minWidth: 0 },
  topContent: { ...theme.typography.topContent, color: theme.colors.regularText, marginBottom: 2 },
  pinner: { ...theme.typography.caption, color: theme.colors.topPinner },
  pinnerName: { color: theme.colors.primary, marginLeft: theme.spacing.sm + 2 },
  // 整张卡（含定位图标）点了跳到原消息，取消置顶单独一个按钮（同旧版：按钮区左右 10、两个图标间隔 10）
  topLocate: { alignSelf: 'center', marginLeft: theme.spacing.sm + 2 },
  topActions: { flexDirection: 'row', alignItems: 'center', marginLeft: theme.spacing.sm + 2, paddingRight: theme.spacing.sm + 2 },
  topAction: { padding: theme.size.topActionPad, borderRadius: theme.radius.tag },
  topActionHover: { backgroundColor: theme.colors.hover },
  strip: (wide: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: wide ? theme.colors.surface : theme.colors.headerBg,
    borderBottomWidth: wide ? 1 : 0,
    borderBottomColor: theme.colors.paneLine,
  }),
  stripLabel: { ...theme.typography.todoLabel, color: theme.colors.titleText, flexShrink: 0 },
  chips: { flex: 1 },
  chipsContent: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  chip: {
    maxWidth: theme.size.todoChipMax,
    height: theme.size.todoChip,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.todoChip,
    backgroundColor: theme.colors.todoChipFill,
    justifyContent: 'center',
  },
  chipText: { ...theme.typography.todoChip, color: theme.colors.todoChipText },
  viewScroll: { flex: 1 },
  viewContent: { paddingTop: theme.spacing.lg, paddingHorizontal: theme.spacing.xl },
  viewMsg: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  viewMain: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: theme.spacing.xs },
  viewName: { ...theme.typography.caption, color: theme.colors.text3 },
  viewBubble: { maxWidth: '100%', paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.block, backgroundColor: theme.colors.searchFill },
  original: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.lg, height: theme.size.chip, borderRadius: theme.radius.menu, marginBottom: theme.spacing.lg },
  originalHover: { backgroundColor: theme.colors.hover },
  originalText: { ...theme.typography.subhead, color: theme.colors.regularText },
  viewLoading: { paddingVertical: theme.spacing.xxl },
  viewFooter: { marginVertical: theme.spacing.lg + 2, marginHorizontal: theme.spacing.xxl + theme.spacing.sm },
  doneButton: (hovered: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    height: theme.size.buttonLarge,
    borderRadius: theme.radius.menu,
    backgroundColor: theme.colors.primary,
    opacity: hovered ? theme.opacity.pressedPrimary : 1,
  }),
  doneText: { ...theme.typography.callout, color: theme.colors.onPrimary },
}));
