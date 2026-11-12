import { type ReactNode, useRef, useState } from 'react';
import { ScrollView, Text, type TextInputInstance, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import type { Msg, WordChainEntry } from '../../../../sync/api/dialog';
import { Sheet } from '../../../../ui/layout';
import { TextField } from '../../../../ui/TextField';
import { showToast } from '../../../../ui/Toast';
import { useErrorText, useSession } from '../../../session';
import { useMessenger, useMsgActions, useUser } from '../../hooks';
import { AddRow, RemoveButton } from './formParts';

type Raw = Record<string, unknown>;
const rawOf = (msg: Msg): Raw => (msg.msg && typeof msg.msg === 'object' ? (msg.msg as Raw) : {});

/** 参与接龙时的名单：这条接龙加上已加载的同一接龙（uuid 相同）各条里新出现的条目，去掉空的（同旧版网页） */
function chainList(msg: Msg, loaded: readonly Msg[]): WordChainEntry[] {
  const raw = rawOf(msg);
  const entries = (value: unknown) => (Array.isArray(value) ? (value as WordChainEntry[]) : []);
  const list = entries(raw.list).map((item) => ({ ...item }));
  for (const other of loaded) {
    const data = rawOf(other);
    if (other.type !== 'word-chain' || data.uuid !== raw.uuid) continue;
    for (const item of entries(data.list)) {
      if (item.type !== 'case' && !list.some((known) => known.id === item.id)) list.push({ ...item });
    }
  }
  return list.filter((item) => (item.text ?? '').trim());
}

/**
 * 发起接龙（群聊）：主题、格式示例、名单（第一条预填自己的昵称）。
 * 带 msg 是参与接龙（接龙结果）：主题和示例只读，名单里只能改自己的、删本次新加的，改动过才能发送。
 * 发送时空示例不发、重复内容只留第一条；有重复时在名单下方提示
 */
export function WordChainSheet({ dialogId, msg, visible, onClose, onSent }: { dialogId: number; msg?: Msg; visible: boolean; onClose: () => void; onSent: () => void }) {
  const t = useT();
  const actions = useMsgActions();
  const messenger = useMessenger();
  const errorText = useErrorText();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const nickname = useSession((s) => s.user?.nickname ?? '');
  const raw = msg ? rawOf(msg) : null;
  const creator = useUser(raw ? Number(raw.createid) || Number(raw.userid) || 0 : 0);
  const topicRef = useRef<TextInputInstance>(null);
  const seq = useRef(0);
  const [topic, setTopic] = useState(() => (raw ? String(raw.text ?? '') : `#${t('messenger:wordChain.tag')} \n`));
  const [list, setList] = useState<WordChainEntry[]>(() => {
    if (msg) return chainList(msg, messenger?.store.getState().windows[dialogId]?.list ?? []);
    const now = Date.now();
    return [
      { id: now, type: 'case', userid: userId, text: '' },
      { id: now + 1, type: 'text', userid: userId, text: nickname },
    ];
  });
  /** 参与时打开的样子：没改动不能发；原有条目不能删 */
  const [original] = useState(() => (msg ? list : null));
  const [busy, setBusy] = useState(false);
  const example = list.find((item) => item.type === 'case');
  const entries = list.filter((item) => item.type === 'text');
  const texts = entries.map((item) => item.text.trim()).filter(Boolean);
  /** 去重后的人数（发出去的就是这些） */
  const count = new Set(texts).size;
  const duplicated = count !== texts.length;
  const ready = !!topic.trim() && count > 0 && (!original || JSON.stringify(list) !== JSON.stringify(original));
  const removable = (item: WordChainEntry) => (original ? !original.some((known) => known.id === item.id) : entries.length > 1);

  const change = (id: number, text: string) => setList((items) => items.map((item) => (item.id === id ? { ...item, text } : item)));
  const add = () => {
    seq.current += 1;
    const id = Date.now() + seq.current;
    setList((items) => [...items, { id, type: 'text', userid: userId, text: nickname }]);
  };

  const submit = () => {
    if (!actions || !ready) return;
    const trimmed = list.map((item) => ({ ...item, text: item.text.trim() }));
    const unique = trimmed.filter((item, index) => !!item.text && trimmed.findIndex((other) => other.text === item.text) === index);
    setBusy(true);
    actions
      .sendWordChain({ dialog_id: dialogId, text: topic.trim(), list: unique, uuid: raw ? String(raw.uuid ?? '') : undefined })
      .then(() => {
        onSent();
        onClose();
      })
      .catch((err) => showToast(errorText(err)))
      .finally(() => setBusy(false));
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={msg ? t('messenger:wordChain.result') : t('messenger:wordChain.title')}
      confirm={{ label: t('messenger:chat.send'), onPress: submit, disabled: !ready, busy }}
      onShow={msg ? undefined : () => topicRef.current?.focus()}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <Text style={styles.note}>{t('messenger:wordChain.initiator', { name: msg ? (creator?.nickname ?? '') : nickname, n: count })}</Text>
        <TextField ref={topicRef} multiline editable={!msg} value={topic} onChangeText={setTopic} placeholder={t('messenger:wordChain.topic')} />
        {example && (!msg || !!example.text) && (
          <Row label={t('messenger:wordChain.example')}>
            <TextField editable={!msg} value={example.text} onChangeText={(text) => change(example.id, text)} placeholder={t('messenger:wordChain.examplePlaceholder')} />
          </Row>
        )}
        {entries.map((item, index) => (
          <Row
            key={item.id}
            label={String(index + 1)}
            trailing={removable(item) && (
              <RemoveButton label={t('messenger:chat.delete')} onPress={() => setList((items) => items.filter((other) => other.id !== item.id))} />
            )}
          >
            <TextField editable={item.userid === userId} value={item.text} onChangeText={(text) => change(item.id, text)} placeholder={t('messenger:wordChain.entry')} />
          </Row>
        ))}
        {duplicated && <Text style={styles.note}>{t('messenger:wordChain.duplicate')}</Text>}
        <AddRow label={t('messenger:wordChain.add')} onPress={add} />
      </ScrollView>
    </Sheet>
  );
}

/** 左侧序号（或「例」）+ 输入框 + 右侧删除 */
function Row({ label, trailing, children }: { label: string; trailing?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>{children}</View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  body: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.page,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  note: { ...theme.typography.footnote, color: theme.colors.text3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  label: { ...theme.typography.subhead, minWidth: theme.size.iconSmall, color: theme.colors.text3 },
  field: { flex: 1 },
}));
