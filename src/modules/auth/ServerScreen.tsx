import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useT } from '../../i18n';
import { pageOrigin } from '../../platform';
import { ApiError } from '../../sync/api';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { TextField } from '../../ui/TextField';
import { connectServer, useErrorText, useSession } from '../session';
import { AuthPage } from './AuthPage';

/**
 * 填服务器地址：取到版本号才算连上，然后回到启动分流（登录页或升级提示）。
 * 第一次打开时，Web 先静默试一下页面所在的站点（部署在服务端 /next 下时就是服务器），成功就直接跳过本页
 */
export function ServerScreen() {
  const t = useT();
  const errorText = useErrorText();
  const saved = useSession((state) => state.server);
  const [address, setAddress] = useState(saved);
  // 第一次打开（还没存过服务器）时要静默试的地址
  const [probe] = useState(() => (saved ? null : pageOrigin()));
  const [busy, setBusy] = useState(probe !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!probe) return;
    let active = true;
    connectServer(probe).then(
      () => {
        if (active) router.replace('/');
      },
      () => {
        if (active) setBusy(false);
      },
    );
    return () => {
      active = false;
    };
  }, [probe]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await connectServer(address);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError && (err.kind === 'invalid' || err.kind === 'no-server') ? t('auth:server.invalid') : errorText(err));
      setBusy(false);
    }
  };

  return (
    <AuthPage title={t('auth:server.title')} back={!!saved}>
      <TextField
        value={address}
        onChangeText={setAddress}
        placeholder={t('auth:server.placeholder')}
        accessibilityLabel={t('auth:server.title')}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="url"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <FormError>{error}</FormError>
      <Button label={t('auth:server.next')} onPress={submit} loading={busy} disabled={!address.trim()} />
    </AuthPage>
  );
}
