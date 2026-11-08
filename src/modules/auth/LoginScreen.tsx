import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Text, type TextInputInstance, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { userApi } from '../../sync/api';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { TextField } from '../../ui/TextField';
import { Touchable } from '../../ui/Touchable';
import { api, refreshSession, signIn, useErrorText, useSession } from '../session';
import { AuthPage } from './AuthPage';

type Captcha = { key: string; img: string };

/**
 * 登录：邮箱 + 密码，需要时加图形验证码（输完邮箱问服务端要不要，或者登录时服务端说要）。
 * 登录成功后登录状态一变，路由守卫自己切到主框架
 */
export function LoginScreen() {
  const t = useT();
  const errorText = useErrorText();
  const server = useSession((state) => state.server);
  const notice = useSession((state) => state.notice);
  const outdated = useSession((state) => state.outdated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const codeRef = useRef<TextInputInstance>(null);

  // 登录前核对服务器版本，过低就转到升级提示
  useEffect(() => {
    refreshSession().catch(() => {});
  }, []);

  if (outdated) return <Redirect href="/upgrade" />;

  const loadCaptcha = async () => {
    try {
      setCaptcha(await userApi.captcha(api));
      setCode('');
    } catch (err) {
      setError(errorText(err));
    }
  };

  const checkNeedCode = async () => {
    const account = email.trim();
    if (!account || captcha) return;
    // 问不到就等登录时服务端再说
    if (await userApi.needCode(api, account).catch(() => false)) await loadCaptcha();
  };

  const submit = async () => {
    if (busy) return;
    const account = email.trim();
    const missing = !account ? 'auth:login.emailPlaceholder' : !password ? 'auth:login.passwordPlaceholder' : captcha && !code.trim() ? 'auth:login.codePlaceholder' : null;
    if (missing) {
      setError(t(missing));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn({ email: account, password, code: captcha ? code.trim() : undefined, codeKey: captcha?.key });
    } catch (err) {
      setBusy(false);
      setError(errorText(err));
      // 验证码一次有效：服务端要求验证码，或者带着验证码失败了，都换一张
      if (captcha || userApi.loginErrorCode(err) === 'need') {
        await loadCaptcha();
        codeRef.current?.focus();
      }
    }
  };

  return (
    <AuthPage title={t('auth:login.title')}>
      <View style={styles.server}>
        <Text style={styles.serverText} numberOfLines={1}>
          {t('auth:server.title')} · {server.replace(/^https?:\/\//, '')}
        </Text>
        <Button variant="plain" label={t('modify')} onPress={() => router.push('/server')} />
      </View>
      {notice !== null && <Text style={styles.notice}>{notice || t('auth:login.authLost')}</Text>}
      <TextField
        value={email}
        onChangeText={setEmail}
        onBlur={checkNeedCode}
        placeholder={t('auth:login.emailPlaceholder')}
        accessibilityLabel={t('auth:login.email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth:login.passwordPlaceholder')}
        accessibilityLabel={t('auth:login.password')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType={captcha ? 'next' : 'go'}
        submitBehavior={captcha ? 'submit' : 'blurAndSubmit'}
        onSubmitEditing={() => (captcha ? codeRef.current?.focus() : submit())}
      />
      {captcha && (
        <TextField
          ref={codeRef}
          value={code}
          onChangeText={setCode}
          placeholder={t('auth:login.codePlaceholder')}
          accessibilityLabel={t('auth:login.code')}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="go"
          onSubmitEditing={submit}
          right={
            <Touchable accessibilityRole="button" accessibilityLabel={t('refresh')} onPress={loadCaptcha}>
              <Image source={{ uri: captcha.img }} style={styles.captcha} resizeMode="contain" />
            </Touchable>
          }
        />
      )}
      <FormError>{error}</FormError>
      <Button label={t('auth:login.title')} onPress={submit} loading={busy} />
    </AuthPage>
  );
}

const styles = StyleSheet.create((theme) => ({
  server: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    marginTop: -theme.spacing.lg,
  },
  serverText: {
    ...theme.typography.footnote,
    flexShrink: 1,
    color: theme.colors.text3,
  },
  notice: {
    ...theme.typography.footnote,
    padding: theme.spacing.md,
    borderRadius: theme.radius.block,
    color: theme.colors.text,
    backgroundColor: theme.colors.primarySoft,
  },
  captcha: {
    width: theme.size.captchaWidth,
    height: theme.size.control,
  },
}));
