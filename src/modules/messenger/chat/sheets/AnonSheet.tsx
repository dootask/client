import { useEffect, useRef, useState } from 'react';
import { Text, type TextInputInstance, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import { Sheet } from '../../../../ui/layout';
import { TextField } from '../../../../ui/TextField';
import { showToast } from '../../../../ui/Toast';
import { useErrorText } from '../../../session';
import { useMsgActions } from '../../hooks';

/** 服务端限制匿名消息长度 */
const MAX_TEXT = 2000;

/** 给单聊对方发匿名消息：由匿名机器人转发，对方看不到是谁发的 */
export function AnonSheet({ userid, visible, onClose }: { userid: number; visible: boolean; onClose: () => void }) {
  return visible ? <AnonContent key={userid} userid={userid} onClose={onClose} /> : null;
}

function AnonContent({ userid, onClose }: { userid: number; onClose: () => void }) {
  const t = useT();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const inputRef = useRef<TextInputInstance>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  const sending = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const value = text.trim();

  const submit = () => {
    if (!actions || !value || sending.current || userid <= 0) return;
    sending.current = true;
    setBusy(true);
    actions
      .sendAnon(userid, value)
      .then((msg) => {
        if (!active.current) return;
        showToast(msg);
        onClose();
      })
      .catch((err) => { if (active.current) showToast(errorText(err)); })
      .finally(() => {
        sending.current = false;
        if (active.current) setBusy(false);
      });
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={t('messenger:anon.title')}
      confirm={{ label: t('messenger:anon.send'), onPress: submit, disabled: !actions || !value || userid <= 0, busy }}
      onShow={() => inputRef.current?.focus()}
    >
      <View style={styles.body}>
        <TextField ref={inputRef} multiline value={text} onChangeText={setText} maxLength={MAX_TEXT} />
        <Text style={styles.hint}>{t('messenger:anon.hint')}</Text>
      </View>
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
  hint: { ...theme.typography.footnote, color: theme.colors.text3 },
}));
