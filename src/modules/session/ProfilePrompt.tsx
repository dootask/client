import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { userApi } from '../../sync/api';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { FormError } from '../../ui/FormError';
import { TextField } from '../../ui/TextField';
import { api } from './api';
import { type ProfileField, useProfilePrompt } from './profilePrompt';
import { useErrorText } from './errorText';
import { saveUser } from './store';

const KEYS = {
  nickname: { title: 'auth:profile.nickname', placeholder: 'auth:profile.nicknamePlaceholder' },
  tel: { title: 'auth:profile.tel', placeholder: 'auth:profile.telPlaceholder' },
} as const;

/** 服务端要求补填昵称 / 电话时弹出（请求钩子 onNeedProfile），填好后原请求自动重试。放在根布局 */
export function ProfilePrompt() {
  const field = useProfilePrompt((state) => state.field);
  const settle = useProfilePrompt((state) => state.settle);
  if (!field || !settle) return null;
  // 换了字段就是新的一次，表单状态重来
  return <ProfileDialog key={field} field={field} settle={settle} />;
}

function ProfileDialog({ field, settle }: { field: ProfileField; settle: (filled: boolean) => void }) {
  const t = useT();
  const errorText = useErrorText();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keys = KEYS[field];

  const submit = async () => {
    const text = value.trim();
    if (busy || !text) return;
    setBusy(true);
    setError(null);
    try {
      saveUser(await userApi.editData(api, { [field]: text }));
      settle(true);
    } catch (err) {
      setBusy(false);
      setError(errorText(err));
    }
  };

  return (
    <Dialog title={t(keys.title)} onClose={() => settle(false)}>
      <TextField
        value={value}
        onChangeText={setValue}
        placeholder={t(keys.placeholder)}
        accessibilityLabel={t(keys.title)}
        keyboardType={field === 'tel' ? 'phone-pad' : 'default'}
        autoComplete={field === 'tel' ? 'tel' : 'nickname'}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <FormError>{error}</FormError>
      <View style={styles.actions}>
        <Button variant="plain" label={t('cancel')} onPress={() => settle(false)} />
        <Button label={t('save')} onPress={submit} loading={busy} disabled={!value.trim()} />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create((theme) => ({
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
}));
