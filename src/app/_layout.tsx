import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { initI18n } from '../i18n';
import { ThemeEffects } from '../ui/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 用户选过的语言在 W7 接入键值存储后传进来
    void initI18n(null).then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    // GestureHandlerRootView 不经过 unistyles 的 babel 插件，样式放在里层的 View 上
    <GestureHandlerRootView style={FILL}>
      <View style={styles.root}>
        <NavigationTheme>
          <ThemeEffects />
          <Stack screenOptions={{ headerShown: false }} />
        </NavigationTheme>
      </View>
    </GestureHandlerRootView>
  );
}

/** 路由容器（页面底色、切页动画露出的底色）跟着应用主题走 */
function NavigationTheme({ children }: { children: React.ReactNode }) {
  const { theme, rt } = useUnistyles();
  const dark = rt.themeName === 'dark';
  const value = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.bg,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.separator,
        notification: theme.colors.badge,
      },
    };
  }, [dark, theme]);
  return <ThemeProvider value={value}>{children}</ThemeProvider>;
}

const FILL = { flex: 1 };

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
}));
