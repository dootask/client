import { type ReactNode, useRef, useState } from 'react';
import { ScrollView, Text, type TextInputInstance, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import type { WordChainEntry } from '../../../../sync/api/dialog';
import { Sheet } from '../../../../ui/layout';
import { TextField } from '../../../../ui/TextField';
import { showToast } from '../../../../ui/Toast';
import { useErrorText, useSession } from '../../../session';
import { useMsgActions } from '../../hooks';
import { AddRow, RemoveButton } from './formParts';

/**
 * 发起接龙（群聊）：主题、格式示例、名单（第一条预填自己的昵称）。
 * 发送时空示例不发、重复内容只留第一条；有重复时在名单下方提示
 */
export function WordChainSheet({ dialogId, visible, onClose, onSent }: { dialogId: number; visible: boolean; onClose: () => void; onSent: () => void }) {
  const t = useT();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const nickname = useSession((s) => s.user?.nickname ?? '');
  const topicRef = useRef<TextInputInstance>(null);
  const seq = useRef(0);
  const [topic, setTopic] = useState(() => `#${t('messenger:wordChain.tag')} \n`);
  const [list, setList] = useState<WordChainEntry[]>(() => {
    const now = Date.now();
    return [
      { id: now, type: 'case', userid: userId, text: '' },
      { id: now + 1, type: 'text', userid: userId, text: nickname },
    ];
  });
  const [busy, setBusy] = useState(false);
  const example = list.find((item) => item.type === 'case');
  const entries = list.filter((item) => item.type === 'text');
  const texts = entries.map((item) => item.text.trim()).filter(Boolean);
  /** 去重后的人数（发出去的就是这些） */
  const count = new Set(texts).size;
  const duplicated = count !== texts.length;
  const ready = !!topic.trim() && count > 0;

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
      .createWordChain({ dialog_id: dialogId, text: topic.trim(), list: unique })
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
      title={t('messenger:wordChain.title')}
      confirm={{ label: t('messenger:chat.send'), onPress: submit, disabled: !ready, busy }}
      onShow={() => topicRef.current?.focus()}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <Text style={styles.note}>{t('messenger:wordChain.initiator', { name: nickname, n: count })}</Text>
        <TextField ref={topicRef} multiline value={topic} onChangeText={setTopic} placeholder={t('messenger:wordChain.topic')} />
        {example && (
          <Row label={t('messenger:wordChain.example')}>
            <TextField value={example.text} onChangeText={(text) => change(example.id, text)} placeholder={t('messenger:wordChain.examplePlaceholder')} />
          </Row>
        )}
        {entries.map((item, index) => (
          <Row
            key={item.id}
            label={String(index + 1)}
            trailing={entries.length > 1 && (
              <RemoveButton label={t('messenger:chat.delete')} onPress={() => setList((items) => items.filter((other) => other.id !== item.id))} />
            )}
          >
            <TextField value={item.text} onChangeText={(text) => change(item.id, text)} placeholder={t('messenger:wordChain.entry')} />
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
