import { useRef, useState } from 'react';
import { ScrollView, type TextInputInstance, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import { Sheet } from '../../../../ui/layout';
import { SwitchRow } from '../../../../ui/SwitchRow';
import { TextField } from '../../../../ui/TextField';
import { showToast } from '../../../../ui/Toast';
import { useErrorText } from '../../../session';
import { useMsgActions } from '../../hooks';
import { AddRow, RemoveButton } from './formParts';

/** 至少两个选项 */
const MIN_OPTIONS = 2;

type Option = { id: number; text: string };

/** 发起投票（群聊）：主题、选项（至少两个且都要填）、多选和匿名开关 */
export function VoteSheet({ dialogId, visible, onClose, onSent }: { dialogId: number; visible: boolean; onClose: () => void; onSent: () => void }) {
  const t = useT();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const topicRef = useRef<TextInputInstance>(null);
  const seq = useRef(MIN_OPTIONS);
  const [topic, setTopic] = useState('');
  const [options, setOptions] = useState<Option[]>(() => Array.from({ length: MIN_OPTIONS }, (_, id) => ({ id, text: '' })));
  const [multiple, setMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const ready = !!topic.trim() && options.every((option) => option.text.trim());

  const change = (id: number, text: string) => setOptions((list) => list.map((option) => (option.id === id ? { ...option, text } : option)));
  const add = () => {
    seq.current += 1;
    const id = seq.current;
    setOptions((list) => [...list, { id, text: '' }]);
  };

  const submit = () => {
    if (!actions || !ready) return;
    setBusy(true);
    actions
      .createVote({
        dialog_id: dialogId,
        text: topic.trim(),
        list: options.map((option) => ({ id: option.id, text: option.text.trim() })),
        multiple,
        anonymous,
      })
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
      title={t('messenger:vote.title')}
      confirm={{ label: t('messenger:chat.send'), onPress: submit, disabled: !ready, busy }}
      onShow={() => topicRef.current?.focus()}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <TextField ref={topicRef} multiline value={topic} onChangeText={setTopic} placeholder={t('messenger:vote.topic')} />
        {options.map((option) => (
          <View key={option.id} style={styles.option}>
            <View style={styles.field}>
              <TextField value={option.text} onChangeText={(text) => change(option.id, text)} placeholder={t('messenger:vote.option')} />
            </View>
            {options.length > MIN_OPTIONS && (
              <RemoveButton label={t('messenger:chat.delete')} onPress={() => setOptions((list) => list.filter((item) => item.id !== option.id))} />
            )}
          </View>
        ))}
        <AddRow label={t('messenger:vote.addOption')} onPress={add} />
        <SwitchRow label={t('messenger:vote.multiple')} value={multiple} onChange={setMultiple} />
        <SwitchRow label={t('messenger:vote.anonymous')} value={anonymous} onChange={setAnonymous} />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  body: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.page,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  option: { flexDirection: 'row', alignItems: 'center' },
  field: { flex: 1 },
}));
