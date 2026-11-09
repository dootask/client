import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import { Sheet } from '../../../../ui/layout';
import { TextField } from '../../../../ui/TextField';
import { showToast } from '../../../../ui/Toast';
import { useErrorText } from '../../../session';
import { useMsgActions } from '../../hooks';

/** 服务端限制备注长度 */
const MAX_REMARK = 255;

/** 修改收藏备注 */
export function FavoriteRemarkSheet({ msgId, visible, onClose }: { msgId: number; visible: boolean; onClose: () => void }) {
  const t = useT();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const value = remark.trim();

  const submit = () => {
    if (!actions || !value) return;
    setBusy(true);
    actions
      .favoriteRemark(msgId, value)
      .then((text) => {
        showToast(text);
        onClose();
      })
      .catch((err) => showToast(errorText(err)))
      .finally(() => setBusy(false));
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('messenger:action.editRemark')}
      confirm={{ label: t('confirm'), onPress: submit, disabled: !value, busy }}
    >
      <View style={styles.body}>
        <TextField
          autoFocus
          value={remark}
          onChangeText={setRemark}
          placeholder={t('messenger:favorite.remark')}
          maxLength={MAX_REMARK}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  body: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
}));
