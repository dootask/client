import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import type { Msg } from '../../../../sync/api/dialog';
import { Sheet } from '../../../../ui/layout';
import { SearchField } from '../../../../ui/SearchField';
import { Segmented } from '../../../../ui/Segmented';
import { showToast } from '../../../../ui/Toast';
import { useErrorText, useSession } from '../../../session';
import { useMsgActions, useUsers } from '../../hooks';
import { defaultCustom, type Remind, remindTime, serverTime } from './remind';
import { RemindOptions } from './RemindOptions';
import { UserCheckRow } from './UserCheckRow';

type Scope = 'all' | 'user';

/** 设待办（C7）：所有成员或指定成员（会话成员里勾选，可搜索），可选提醒时间 */
export function TodoSetSheet({ msg, visible, onClose }: { msg: Msg | null; visible: boolean; onClose: () => void }) {
  const t = useT();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const [scope, setScope] = useState<Scope>('all');
  const [picked, setPicked] = useState<ReadonlySet<number>>(() => new Set());
  const [remind, setRemind] = useState<Remind>('none');
  const [custom, setCustom] = useState(() => defaultCustom());
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!actions || !msg) return;
    setBusy(true);
    actions
      .setTodo({
        msg_id: msg.id,
        type: scope,
        userids: scope === 'user' ? [...picked] : [],
        remind_at: serverTime(remindTime(remind, custom, 0)),
      })
      .then((text) => {
        showToast(text);
        onClose();
      })
      .catch((err) => showToast(errorText(err)))
      .finally(() => setBusy(false));
  };

  const toggle = useCallback((userid: number) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(userid)) next.add(userid);
      return next;
    });
  }, []);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('messenger:todos.setTitle')}
      fill={scope === 'user'}
      confirm={{
        label: t('confirm'),
        onPress: submit,
        disabled: scope === 'user' && picked.size === 0,
        busy,
      }}
    >
      <View style={styles.top}>
        <Segmented
          items={[
            { key: 'all', label: t('messenger:todos.all') },
            { key: 'user', label: t('messenger:todos.some') },
          ]}
          value={scope}
          onChange={setScope}
        />
      </View>
      {scope === 'user' && msg && <MemberChecklist dialogId={msg.dialog_id} picked={picked} onToggle={toggle} />}
      <ScrollView style={styles.remindScroll} contentContainerStyle={styles.remind} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('messenger:todos.remind')}</Text>
        <RemindOptions remind={remind} custom={custom} onRemind={setRemind} onCustom={setCustom} />
      </ScrollView>
    </Sheet>
  );
}

/** 会话成员（不含机器人），自己排第一；按昵称、拼音搜 */
export function MemberChecklist({ dialogId, picked, onToggle }: { dialogId: number; picked: ReadonlySet<number>; onToggle: (userid: number) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const selfId = useSession((s) => s.user?.userid ?? 0);
  const [ids, setIds] = useState<number[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [key, setKey] = useState('');

  useEffect(() => {
    let cancelled = false;
    actions
      ?.members(dialogId)
      .then((rows) => {
        if (cancelled) return;
        const list = rows.filter((r) => !r.bot).map((r) => r.userid);
        setIds([...list.filter((id) => id === selfId), ...list.filter((id) => id !== selfId)]);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [actions, dialogId, selfId]);

  const users = useUsers(ids ?? EMPTY);
  const keyword = key.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!ids || !keyword) return ids;
    return ids.filter((id) => `${users[id]?.nickname ?? ''} ${users[id]?.pinyin ?? ''}`.toLowerCase().includes(keyword));
  }, [ids, users, keyword]);

  const renderItem = useCallback(
    ({ item }: { item: number }) => <UserCheckRow userid={item} checked={picked.has(item)} onPress={onToggle} />,
    [picked, onToggle],
  );

  return (
    <>
      <View style={styles.search}>
        <SearchField value={key} onChangeText={setKey} placeholder={t('messenger:todos.searchMembers')} clearLabel={t('clear')} />
      </View>
      <View style={styles.members}>
        {shown ? (
          <FlashList
            data={shown}
            renderItem={renderItem}
            keyExtractor={String}
            extraData={picked}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.hint}>{t('none')}</Text>}
          />
        ) : failed ? (
          <Text style={styles.hint}>{t('loadFailed')}</Text>
        ) : (
          <ActivityIndicator color={theme.colors.text3} style={styles.loading} />
        )}
      </View>
    </>
  );
}

const EMPTY: number[] = [];

const styles = StyleSheet.create((theme) => ({
  top: {
    paddingHorizontal: theme.spacing.page,
    paddingBottom: theme.spacing.md,
  },
  search: {
    paddingHorizontal: theme.spacing.page,
    paddingBottom: theme.spacing.xs,
  },
  members: { flex: 1, minHeight: theme.size.rowSingle * 3 },
  hint: {
    ...theme.typography.subhead,
    color: theme.colors.text3,
    textAlign: 'center',
    padding: theme.spacing.xxl,
  },
  loading: { padding: theme.spacing.xxl },
  remindScroll: { flexGrow: 0, flexShrink: 1 },
  remind: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.page,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  label: { ...theme.typography.footnote, color: theme.colors.text3 },
}));
