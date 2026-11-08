import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { MIN_SERVER_VERSION, refreshSession, useErrorText, useSession } from '../session';
import { AuthPage } from './AuthPage';

/** 服务器版本低于最低要求：说明当前和要求的版本，升级后点刷新重新核对，或者换一台服务器 */
export function UpgradeScreen() {
  const t = useT();
  const errorText = useErrorText();
  const outdated = useSession((state) => state.outdated);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 核对通过（或从别处进来时本就不低）就回启动分流
  if (!outdated) return <Redirect href="/" />;

  const recheck = async () => {
    setBusy(true);
    setError(null);
    try {
      await refreshSession();
    } catch (err) {
      setError(errorText(err));
    }
    setBusy(false);
  };

  return (
    <AuthPage title={t('auth:upgrade.message')}>
      <View style={styles.versions}>
        <Text style={styles.version}>
          {t('auth:upgrade.current')}: {outdated}
        </Text>
        <Text style={styles.version}>
          {t('auth:upgrade.minimum')}: {MIN_SERVER_VERSION}
        </Text>
      </View>
      <FormError>{error}</FormError>
      <Button label={t('refresh')} onPress={recheck} loading={busy} />
      <Button variant="plain" label={t('modify')} onPress={() => router.push('/server')} />
    </AuthPage>
  );
}

const styles = StyleSheet.create((theme) => ({
  versions: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  version: {
    ...theme.typography.subhead,
    color: theme.colors.text2,
  },
}));
