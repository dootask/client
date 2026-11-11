import { Square, SquareCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import { Icon } from '../../../../ui/Icon';
import { Sheet } from '../../../../ui/layout';
import { showToast } from '../../../../ui/Toast';
import { Touchable } from '../../../../ui/Touchable';
import { useErrorText } from '../../../session';
import { useMsgActions } from '../../hooks';
import { DialogPicker } from '../../picker/DialogPicker';
import { isGroup, pickKey, pickName, type Picked } from '../../picker/pickerData';
import { PickAvatar } from '../../picker/pickerParts';
import type { ForwardSheetProps } from './forwardSheetTypes';

/** 服务端一次最多发往的会话数 */
const MAX_TARGETS = 50;

/**
 * 转发（旧版 App）：选会话（人和群，最多 50）后弹「确认转发」：收件人、「不显示原发送者信息」（合并转发时没有）、留言。
 * 确认弹层取消回到选择页；发出后两层一起关
 */
export function ForwardSheet({ msgIds, defaultMerge = false, visible, onClose, onSent }: ForwardSheetProps) {
  const t = useT();
  const [pending, setPending] = useState<Picked[] | null>(null);
  return (
    <>
      <DialogPicker
        visible={visible}
        title={defaultMerge ? t('messenger:forward.merge') : t('messenger:action.forward')}
        max={MAX_TARGETS}
        onSubmit={setPending}
        onClose={onClose}
      />
      <ForwardConfirm
        visible={visible && pending !== null}
        msgIds={msgIds}
        merge={defaultMerge}
        recipients={pending ?? []}
        onCancel={() => setPending(null)}
        onSent={() => {
          onSent?.();
          onClose();
        }}
      />
    </>
  );
}

function ForwardConfirm({ visible, msgIds, merge, recipients, onCancel, onSent }: {
  visible: boolean;
  msgIds: readonly number[];
  merge: boolean;
  recipients: Picked[];
  onCancel: () => void;
  onSent: () => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const [hideSource, setHideSource] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submit = () => {
    if (!actions) return;
    setSending(true);
    actions
      .forward({
        msg_ids: [...msgIds],
        merge,
        dialogids: recipients.flatMap((item) => (isGroup(item) ? [item.dialogId] : [])),
        userids: recipients.flatMap((item) => (isGroup(item) ? [] : [item.userid])),
        show_source: merge || !hideSource,
        leave_message: message.trim(),
      })
      .then(() => {
        showToast(t('messenger:forward.done'));
        onSent();
      })
      .catch((err) => {
        showToast(errorText(err));
        setSending(false);
      });
  };

  const single = recipients.length === 1 ? recipients[0] : undefined;
  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      title={t('messenger:forward.confirmTitle')}
      confirm={{ label: t('messenger:action.forward'), onPress: submit, busy: sending }}
    >
      <View style={styles.body}>
        {single ? (
          <View style={styles.single}>
            <PickAvatar item={single} size={40} />
            <Text style={styles.singleName} numberOfLines={1}>
              {pickName(single)}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatars}>
            {recipients.map((item) => (
              <PickAvatar key={pickKey(item)} item={item} size={40} />
            ))}
          </ScrollView>
        )}
        {!merge && (
          <Touchable
            accessibilityRole="checkbox"
            aria-checked={hideSource}
            onPress={() => setHideSource(!hideSource)}
            hitSlop={{ left: theme.spacing.sm, right: theme.spacing.sm }}
            style={({ pressed }) => styles.option(pressed)}
          >
            <Icon icon={hideSource ? SquareCheck : Square} color={hideSource ? theme.colors.primary : theme.colors.text3} size={theme.size.checkMark} />
            <Text style={styles.optionText}>{t('messenger:forward.hideSource')}</Text>
          </Touchable>
        )}
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={t('messenger:forward.message')}
          placeholderTextColor={theme.colors.text3}
          multiline
          editable={!sending}
          style={styles.message}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  body: { paddingHorizontal: theme.spacing.page, paddingBottom: theme.spacing.md, gap: theme.spacing.md },
  single: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  singleName: { ...theme.typography.body, flex: 1, color: theme.colors.text },
  avatars: { gap: theme.spacing.sm },
  option: (pressed: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    opacity: pressed ? theme.opacity.pressedIcon : 1,
  }),
  optionText: { ...theme.typography.callout, color: theme.colors.text2 },
  message: {
    ...theme.typography.body,
    minHeight: theme.size.forwardMessageMin,
    maxHeight: theme.size.forwardMessageMax,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.block,
    backgroundColor: theme.colors.fill,
    color: theme.colors.text,
  },
}));
