import { AlarmClock, CircleCheck, ListTodo } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dateFormats, useLanguage, useT } from '../../../../i18n';
import type { MyTodo } from '../../../../sync/api/dialog';
import { toUnix } from '../../../../sync/messenger';
import { msgPreview } from '../../../../sync/messenger/preview';
import { Icon } from '../../../../ui/Icon';
import { Sheet } from '../../../../ui/layout';
import { showToast } from '../../../../ui/Toast';
import { Touchable } from '../../../../ui/Touchable';
import { useErrorText } from '../../../session';
import { useMsgActions } from '../../hooks';
import { PreviewText } from '../../PreviewText';
import { formatMoment } from '../format';
import { useTopMsg } from '../topMsg';

/** 点了打钩后，等这么久没再点「完成」就退回打钩（同旧版 App） */
const CONFIRM_MS = 3000;

/**
 * 我在这个会话里没完成的待办（同旧版 App）：点一项跳到原文；右侧打钩变成「完成」再点一次才完成，防误触。
 * 全部完成后自动关闭
 */
export function MyTodoSheet({ dialogId, visible, onClose, onJump }: { dialogId: number; visible: boolean; onClose: () => void; onJump: (msgId: number) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const [todos, setTodos] = useState<MyTodo[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [armed, setArmed] = useState(0);
  const [doing, setDoing] = useState<number[]>([]);

  const load = useCallback(() => {
    actions
      ?.myTodos(dialogId)
      .then(setTodos)
      .catch(() => setFailed(true));
  }, [actions, dialogId]);
  useEffect(load, [load]);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(0), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  const empty = todos?.length === 0;
  useEffect(() => {
    if (empty) onClose();
  }, [empty, onClose]);

  const done = (todo: MyTodo) => {
    setArmed(0);
    setDoing((list) => [...list, todo.id]);
    actions
      ?.done(todo.id, dialogId)
      .then(() => setTodos((list) => list?.filter((item) => item.id !== todo.id) ?? null))
      .catch((err) => showToast(errorText(err)))
      .finally(() => setDoing((list) => list.filter((id) => id !== todo.id)));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('messenger:todo')}>
      {todos ? (
        <ScrollView style={styles.list}>
          {todos.map((todo) => (
            <TodoRow
              key={todo.id}
              dialogId={dialogId}
              todo={todo}
              state={doing.includes(todo.id) ? 'busy' : armed === todo.id ? 'armed' : 'idle'}
              onPress={() => {
                onClose();
                onJump(todo.msg_id);
              }}
              onArm={() => setArmed(todo.id)}
              onConfirm={() => done(todo)}
            />
          ))}
        </ScrollView>
      ) : failed ? (
        <Text style={styles.hint}>{t('loadFailed')}</Text>
      ) : (
        <ActivityIndicator color={theme.colors.text3} style={styles.hint} />
      )}
    </Sheet>
  );
}

function TodoRow({ dialogId, todo, state, onPress, onArm, onConfirm }: {
  dialogId: number;
  todo: MyTodo;
  state: 'idle' | 'armed' | 'busy';
  onPress: () => void;
  onArm: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const preview = msgPreview(useTopMsg(dialogId, todo.msg_id));
  const remindAt = toUnix(todo.remind_at) * 1000;
  return (
    <Touchable accessibilityRole="button" onPress={onPress} style={({ pressed }) => styles.row(pressed)}>
      <Icon icon={ListTodo} color={theme.colors.warning} size={theme.size.iconSmall} />
      <View style={styles.body}>
        <Text style={styles.text} numberOfLines={2}>
          {preview ? <PreviewText preview={preview} /> : ' '}
        </Text>
        {remindAt > 0 && <RemindTime at={remindAt} />}
      </View>
      {state === 'busy' ? (
        <View style={styles.slot}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : state === 'armed' ? (
        <Touchable accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={onConfirm} style={({ pressed }) => styles.confirm(pressed)}>
          <Text style={styles.confirmText}>{t('messenger:todos.complete')}</Text>
        </Touchable>
      ) : (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t('messenger:todos.complete')}
          hitSlop={theme.spacing.sm}
          onPress={onArm}
          style={({ pressed }) => [styles.slot, pressed && styles.pressed]}
        >
          <Icon icon={CircleCheck} color={theme.colors.primary} size={theme.size.todoCheck} />
        </Touchable>
      )}
    </Touchable>
  );
}

/** 提醒时间：还没到用警示色，已过变灰（以弹层打开时为准） */
function RemindTime({ at }: { at: number }) {
  const { theme } = useUnistyles();
  const language = useLanguage();
  const [now] = useState(Date.now);
  const color = at > now ? theme.colors.warning : theme.colors.text3;
  return (
    <View style={styles.remind}>
      <Icon icon={AlarmClock} color={color} size={theme.size.remindIcon} />
      <Text style={[styles.remindText, { color }]}>{formatMoment(at, dateFormats(language))}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  list: { maxHeight: theme.size.todoListMax },
  row: (pressed: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: theme.size.rowSingle,
    paddingHorizontal: theme.spacing.page,
    paddingVertical: theme.spacing.sm,
    backgroundColor: pressed ? theme.colors.fillPressed : 'transparent',
  }),
  body: { flex: 1, gap: theme.size.todoTextGap },
  text: { ...theme.typography.body, color: theme.colors.text },
  remind: { flexDirection: 'row', alignItems: 'center', gap: theme.size.remindGap },
  remindText: { ...theme.typography.footnote },
  slot: { width: theme.size.segment, height: theme.size.segment, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: theme.opacity.pressedIcon },
  confirm: (pressed: boolean) => ({
    height: theme.size.segment,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    opacity: pressed ? theme.opacity.pressedPrimary : 1,
  }),
  confirmText: { ...theme.typography.footnoteStrong, color: theme.colors.onPrimary },
  hint: { paddingVertical: theme.spacing.xxl, alignSelf: 'center' },
}));
