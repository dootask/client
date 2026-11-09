import { AlarmClockPlus } from 'lucide-react-native';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dateFormats, useLanguage, useT } from '../../../../i18n';
import type { Msg, TodoRow } from '../../../../sync/api/dialog';
import { toUnix } from '../../../../sync/messenger';
import { Icon } from '../../../../ui/Icon';
import { Sheet } from '../../../../ui/layout';
import { Confirm } from '../../../../ui/popover';
import { showToast } from '../../../../ui/Toast';
import { Touchable } from '../../../../ui/Touchable';
import { useErrorText, useSession } from '../../../session';
import { useMsgActions } from '../../hooks';
import { formatMoment } from '../format';
import { customOf, type Remind, remindOf, remindTime, serverTime } from './remind';
import { RemindOptions } from './RemindOptions';
import { UserCheckRow } from './UserCheckRow';

const msOf = (time: string | null | undefined) => toUnix(time) * 1000;

/**
 * 待办详情：未完成 / 已完成两组名单。自己那条可以直接完成；点未完成的人改提醒时间、取消提醒或把他移出待办
 */
export function TodoDetailSheet({ msg, visible, onClose }: { msg: Msg | null; visible: boolean; onClose: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const [rows, setRows] = useState<TodoRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<TodoRow | null>(null);
  const msgId = msg?.id ?? 0;

  const load = useCallback(() => {
    if (!actions || !msgId) return;
    actions
      .todoList(msgId)
      .then((list) => {
        setRows(list);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [actions, msgId]);
  useEffect(load, [load]);

  const failedToast = (err: unknown) => showToast(errorText(err));
  const done = (row: TodoRow) => actions?.done(row.id, msg?.dialog_id ?? 0).then(load).catch(failedToast);

  if (editing && msg) {
    return (
      <RemindEdit
        visible={visible}
        row={editing}
        onBack={() => setEditing(null)}
        onClose={onClose}
        onSubmit={(at) =>
          actions
            ?.todoRemind({
              msg_id: msg.id,
              userids: [editing.userid],
              remind_at: serverTime(at) ?? '',
            })
            .then((text) => {
              showToast(text);
              setEditing(null);
              load();
            })
        }
        onRemove={() => {
          const rest = (rows ?? []).filter((r) => r.userid !== editing.userid).map((r) => r.userid);
          return actions?.setTodo({ msg_id: msg.id, type: 'user', userids: rest }).then((text) => {
            showToast(text);
            setEditing(null);
            if (rest.length === 0) onClose();
            else load();
          });
        }}
      />
    );
  }

  const undone = rows?.filter((r) => !r.done_at) ?? [];
  const finished = rows?.filter((r) => !!r.done_at) ?? [];
  return (
    <Sheet visible={visible} onClose={onClose} title={t('messenger:action.todoDetail')}>
      {rows ? (
        <ScrollView>
          <Group label={`${t('messenger:todos.undone')} (${undone.length})`}>
            {undone.map((row) => (
              <UserCheckRow key={row.id} userid={row.userid} onPress={() => setEditing(row)} trailing={<UndoneTrailing row={row} onDone={done} />} />
            ))}
          </Group>
          <Group label={`${t('messenger:todos.done')} (${finished.length})`}>
            {finished.map((row) => (
              <UserCheckRow key={row.id} userid={row.userid} trailing={<Moment ms={msOf(row.done_at)} />} />
            ))}
          </Group>
        </ScrollView>
      ) : failed ? (
        <Text style={styles.hint}>{t('loadFailed')}</Text>
      ) : (
        <ActivityIndicator color={theme.colors.text3} style={styles.hint} />
      )}
    </Sheet>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Moment({ ms }: { ms: number }) {
  const language = useLanguage();
  return ms > 0 ? <Text style={styles.moment}>{formatMoment(ms, dateFormats(language))}</Text> : null;
}

/** 未完成的人右侧：提醒时间（没有时是加提醒图标）；自己的那条带「完成」 */
function UndoneTrailing({ row, onDone }: { row: TodoRow; onDone: (row: TodoRow) => Promise<void> | undefined }) {
  const t = useT();
  const { theme } = useUnistyles();
  const self = useSession((s) => s.user?.userid ?? 0) === row.userid;
  const [busy, setBusy] = useState(false);
  const at = msOf(row.remind_at);
  return (
    <View style={styles.trailing}>
      {at > 0 ? <Moment ms={at} /> : <Icon icon={AlarmClockPlus} color={theme.colors.text3} size={theme.size.iconSmall} />}
      {self && (
        <Touchable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void Promise.resolve(onDone(row)).finally(() => setBusy(false));
          }}
          style={({ pressed, hovered }) => styles.doneButton(pressed, hovered)}
        >
          {busy ? <ActivityIndicator size="small" color={theme.colors.onPrimary} /> : <Text style={styles.doneText}>{t('messenger:todos.complete')}</Text>}
        </Touchable>
      )}
    </View>
  );
}

/** 改某人的提醒时间：已有时间对上预设就选预设，否则单列一项；可以取消提醒、把他移出待办 */
function RemindEdit({
  visible,
  row,
  onBack,
  onClose,
  onSubmit,
  onRemove,
}: {
  visible: boolean;
  row: TodoRow;
  onBack: () => void;
  onClose: () => void;
  onSubmit: (at: number) => Promise<void> | undefined;
  onRemove: () => Promise<void> | undefined;
}) {
  const t = useT();
  const errorText = useErrorText();
  const at = msOf(row.remind_at);
  const [remind, setRemind] = useState<Remind>(() => remindOf(at));
  const [current] = useState(() => (remind === 'current' ? at : 0));
  const [custom, setCustom] = useState(() => customOf(at));
  const [busy, setBusy] = useState(false);
  const run = (task: () => Promise<void> | undefined) => {
    setBusy(true);
    void Promise.resolve(task())
      .catch((err) => showToast(errorText(err)))
      .finally(() => setBusy(false));
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('messenger:todos.remind')}
      confirm={{
        label: t('confirm'),
        onPress: () => run(() => onSubmit(remindTime(remind, custom, current))),
        busy,
      }}
    >
      <ScrollView contentContainerStyle={styles.edit}>
        <UserCheckRow userid={row.userid} />
        <View style={styles.options}>
          <RemindOptions remind={remind} custom={custom} current={current} withNone={false} onRemind={setRemind} onCustom={setCustom} />
        </View>
        {at > 0 && <TextAction label={t('messenger:todos.cancelRemind')} onPress={() => run(() => onSubmit(0))} />}
        <Confirm
          title={t('messenger:todos.removeConfirm')}
          destructive
          onConfirm={() => run(onRemove)}
          style={({ pressed, hovered }) => styles.action(pressed, hovered)}
        >
          <Text style={styles.danger}>{t('messenger:action.todoCancel')}</Text>
        </Confirm>
        <TextAction label={t('back')} onPress={onBack} muted />
      </ScrollView>
    </Sheet>
  );
}

function TextAction({ label, onPress, muted = false }: { label: string; onPress: () => void; muted?: boolean }) {
  return (
    <Touchable accessibilityRole="button" onPress={onPress} style={({ pressed, hovered }) => styles.action(pressed, hovered)}>
      <Text style={muted ? styles.muted : styles.link}>{label}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  hint: {
    ...theme.typography.subhead,
    color: theme.colors.text3,
    textAlign: 'center',
    padding: theme.spacing.xxl,
  },
  group: { paddingBottom: theme.spacing.sm },
  groupLabel: {
    ...theme.typography.footnote,
    color: theme.colors.text3,
    paddingHorizontal: theme.spacing.page,
    paddingVertical: theme.spacing.xs,
  },
  moment: {
    ...theme.typography.footnote,
    color: theme.colors.text3,
    fontVariant: ['tabular-nums'],
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  doneButton: (pressed: boolean, hovered: boolean) => ({
    minWidth: theme.size.touch + theme.spacing.md,
    height: theme.size.chip,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    opacity: pressed ? theme.opacity.pressedPrimary : hovered ? 0.92 : 1,
  }),
  doneText: {
    ...theme.typography.footnote,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
  edit: { paddingBottom: theme.spacing.md },
  options: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.page,
    paddingVertical: theme.spacing.sm,
  },
  action: (pressed: boolean, hovered: boolean) => ({
    minHeight: theme.size.rowSingle,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.page,
    backgroundColor: pressed ? theme.colors.fillPressed : hovered ? theme.colors.hover : 'transparent',
  }),
  link: { ...theme.typography.body, color: theme.colors.primaryText },
  danger: { ...theme.typography.body, color: theme.colors.danger },
  muted: { ...theme.typography.body, color: theme.colors.text2 },
}));
