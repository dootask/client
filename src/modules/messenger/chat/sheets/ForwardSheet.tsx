import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import { CheckMark, CheckOption } from '../../../../ui/CheckMark';
import { Sheet } from '../../../../ui/layout';
import { SearchField } from '../../../../ui/SearchField';
import { TextField } from '../../../../ui/TextField';
import { showToast } from '../../../../ui/Toast';
import { Touchable } from '../../../../ui/Touchable';
import { useErrorText } from '../../../session';
import { RowAvatar, type RowData } from '../../DialogRow';
import { useMessengerState, useMsgActions } from '../../hooks';
import { listedIds } from '../../listModel';
import { AI_HIDDEN, searchRowKey, type SearchRow, useSearchRows } from '../../search';

/** 服务端一次最多发往的会话数 */
const MAX_TARGETS = 50;

/** 选中的目标：会话 id，或还没有单聊的联系人 `u:<userid>` */
type Picked = Map<string, RowData>;

const pickKey = (d: RowData) => String(d.id);

/**
 * 转发（C4）：搜索并勾选会话和联系人（最多 50 个），可选不显示原发送者、合并转发（多条时）、留言。
 * 不搜索时列出消息列表里的会话，搜索时补上服务端搜到的联系人
 */
export function ForwardSheet({ msgIds, visible, onClose, onSent }: { msgIds: readonly number[]; visible: boolean; onClose: () => void; onSent?: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const [key, setKey] = useState('');
  const [picked, setPicked] = useState<Picked>(() => new Map());
  const [hideSource, setHideSource] = useState(false);
  const [merge, setMerge] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const keyword = key.trim();
  const dialogs = useMessengerState((s) => s.dialogs);
  const [now] = useState(() => Date.now() / 1000);
  const ids = useMemo(() => listedIds({ dialogs, drafts: {}, openId: 0, aiHidden: AI_HIDDEN, now }, '', keyword), [dialogs, now, keyword]);
  const { rows, searching } = useSearchRows(ids, keyword);

  const toggle = useCallback(
    (d: RowData) => {
      setPicked((prev) => {
        const next = new Map(prev);
        const k = pickKey(d);
        if (next.has(k)) next.delete(k);
        else if (next.size >= MAX_TARGETS) {
          showToast(t('messenger:forward.max', { n: MAX_TARGETS }));
          return prev;
        } else next.set(k, d);
        return next;
      });
    },
    [t],
  );

  const submit = () => {
    if (!actions) return;
    const targets = [...picked.values()];
    setSending(true);
    actions
      .forward({
        msg_ids: [...msgIds],
        merge: msgIds.length > 1 && merge,
        dialogids: targets.filter((d) => typeof d.id === 'number').map((d) => d.id as number),
        userids: targets
          .filter((d) => typeof d.id === 'string')
          .map((d) => d.dialog_user?.userid ?? 0)
          .filter((id) => id > 0),
        show_source: !hideSource,
        leave_message: message.trim(),
      })
      .then(() => {
        showToast(t('messenger:forward.done'));
        onSent?.();
        onClose();
      })
      .catch((err) => showToast(errorText(err)))
      .finally(() => setSending(false));
  };

  const renderItem = useCallback(
    ({ item }: { item: SearchRow }) => (
      <TargetRow row={item} picked={item.kind === 'dialog' ? picked.has(String(item.id)) : picked.has(pickKey(item.item))} onToggle={toggle} />
    ),
    [picked, toggle],
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('messenger:action.forward')}
      fill
      confirm={{
        label: picked.size > 0 ? `${t('messenger:chat.send')} (${picked.size})` : t('messenger:chat.send'),
        onPress: submit,
        disabled: picked.size === 0,
        busy: sending,
      }}
    >
      <View style={styles.search}>
        <SearchField value={key} onChangeText={setKey} placeholder={t('messenger:search')} clearLabel={t('clear')} />
      </View>
      {picked.size > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pickedBar}
          contentContainerStyle={styles.picked}
          keyboardShouldPersistTaps="handled"
        >
          {[...picked.values()].map((d) => (
            <Touchable
              key={pickKey(d)}
              accessibilityRole="button"
              accessibilityLabel={d.name ?? ''}
              onPress={() => toggle(d)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <RowAvatar d={d} size={40} />
            </Touchable>
          ))}
        </ScrollView>
      )}
      <View style={styles.list}>
        <FlashList
          data={rows}
          renderItem={renderItem}
          keyExtractor={searchRowKey}
          extraData={picked}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={searching ? <ActivityIndicator color={theme.colors.text3} style={styles.loading} /> : null}
          ListEmptyComponent={searching ? null : <Text style={styles.empty}>{keyword ? t('messenger:noResult', { key: keyword }) : t('messenger:empty')}</Text>}
        />
      </View>
      <View style={styles.footer}>
        <View style={styles.options}>
          <CheckOption label={t('messenger:forward.hideSource')} checked={hideSource} onChange={setHideSource} />
          {msgIds.length > 1 && <CheckOption label={t('messenger:forward.merge')} checked={merge} onChange={setMerge} />}
        </View>
        <TextField value={message} onChangeText={setMessage} placeholder={t('messenger:forward.message')} editable={!sending} />
      </View>
    </Sheet>
  );
}

/** 一个目标：头像、名字、勾选圈 */
function TargetRow({ row, picked, onToggle }: { row: SearchRow; picked: boolean; onToggle: (d: RowData) => void }) {
  const dialog = useMessengerState((s) => (row.kind === 'dialog' ? s.dialogs[row.id] : undefined));
  const d: RowData | undefined = row.kind === 'dialog' ? dialog : row.item;
  if (!d) return null;
  return (
    <Touchable
      accessibilityRole="checkbox"
      aria-checked={picked}
      onPress={() => onToggle(d)}
      style={({ pressed, hovered }) => styles.row(picked, pressed, hovered)}
    >
      <RowAvatar d={d} size={40} />
      <Text style={styles.name} numberOfLines={1}>
        {d.name}
      </Text>
      <CheckMark checked={picked} />
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  search: {
    paddingHorizontal: theme.spacing.page,
    paddingBottom: theme.spacing.sm,
  },
  pickedBar: { flexGrow: 0 },
  picked: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.page,
    paddingBottom: theme.spacing.sm,
  },
  pressed: { opacity: theme.opacity.pressedIcon },
  list: { flex: 1, minHeight: theme.size.rowSingle * 3 },
  loading: { padding: theme.spacing.lg },
  empty: {
    ...theme.typography.subhead,
    color: theme.colors.text3,
    textAlign: 'center',
    padding: theme.spacing.xxl,
  },
  row: (picked: boolean, pressed: boolean, hovered: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: theme.size.rowSingle + theme.spacing.xs,
    paddingHorizontal: theme.spacing.page,
    backgroundColor: pressed ? theme.colors.fillPressed : picked ? theme.colors.rowHighlight : hovered ? theme.colors.hover : 'transparent',
  }),
  name: { ...theme.typography.body, color: theme.colors.text, flex: 1 },
  footer: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.page,
    paddingTop: theme.spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.separator,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: theme.spacing.lg,
  },
}));
