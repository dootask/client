import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { initI18n } from '../i18n';
import { MediaHost } from '../modules/media';
import { NotificationEffects, startMessengerService } from '../modules/messenger';
import { entryHref, ProfilePrompt, refreshSession, useSession } from '../modules/session';
import { restorePreferences } from '../modules/setting';
import { BrowserDefaults } from '../ui/BrowserDefaults';
import { KeyboardRoot } from '../ui/KeyboardRoot';
import { TooltipHost } from '../ui/popover';
import { ThemeEffects } from '../ui/theme';
import { LayerConfirmHost } from '../ui/LayerConfirm';
import { ToastHost } from '../ui/Toast';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 键值存储是同步的：深浅色在首屏渲染前恢复，语言包加载完再渲染
    const { language } = restorePreferences();
    void initI18n(language).then(() => setReady(true));
    // 冷启动先按存下的登录状态渲染，后台核对服务器版本、刷新我的信息
    refreshSession().catch(() => {});
  }, []);

  // 消息服务跟着登录状态启停（连 WebSocket、同步会话列表）
  useEffect(() => startMessengerService(), []);

  if (!ready) return null;

  return (
    // GestureHandlerRootView 不经过 unistyles 的 babel 插件，样式放在里层的 View 上
    <GestureHandlerRootView style={FILL}>
      <KeyboardRoot>
        <View style={styles.root}>
          <NavigationTheme>
            <ThemeEffects />
            <BrowserDefaults />
            <Routes />
            <ProfilePrompt />
            {/* 网页的图片、视频查看层（App 走 media-preview 页） */}
            <MediaHost />
            {/* 新消息提醒：网页弹浏览器通知、标签页标题带未读数；App 前台弹顶部横幅（要画在页面上面，放在 Routes 之后） */}
            <NotificationEffects />
            <LayerConfirmHost />
            <ToastHost />
            {/* 全页共用的悬停提示层（只在 Web 上有内容），放在最上面 */}
            <TooltipHost />
          </NavigationTheme>
        </View>
      </KeyboardRoot>
    </GestureHandlerRootView>
  );
}

/**
 * 按登录状态守卫路由：没登录（或服务器版本过低）进不了主框架，登录了进不了登录页，状态一变自动切换。
 * 被挡住的页面直接转到该去的页面（不经过启动分流再转一次），而且不带切页动画：
 * 被挡的页面已经变成空白，带动画会看到空白页滑走
 */
function Routes() {
  const inside = useSession((state) => state.token !== '' && state.outdated === null);
  const entry = useSession(entryHref);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={inside} redirectTo={entry}>
        <Stack.Screen name="(main)" options={NO_ANIMATION} />
        {/* 长文阅读（App 整页推入；网页在新标签页打开，同旧版 /single/file/msg）、公式查看（App） */}
        <Stack.Screen name="msg-detail/[msgId]" />
        <Stack.Screen name="math" />
        {/* 用户资料、标签、共同群组、项目与任务，建群（App 整页推入，盖住 Tab；网页资料和建群是居中弹窗） */}
        <Stack.Screen name="user/[userid]/index" />
        <Stack.Screen name="user/[userid]/tags" />
        <Stack.Screen name="user/[userid]/groups" />
        <Stack.Screen name="user/[userid]/works" />
        <Stack.Screen name="group/create" />
      </Stack.Protected>
      <Stack.Protected guard={!inside} redirectTo={entry}>
        <Stack.Screen name="(auth)" options={NO_ANIMATION} />
      </Stack.Protected>
      {/* 图片、视频查看页：透明模态，下拉关闭时露出下层页面 */}
      <Stack.Screen name="media-preview" options={MEDIA_PREVIEW} />
    </Stack>
  );
}

const NO_ANIMATION = { animation: 'none' } as const;
const MEDIA_PREVIEW = { presentation: 'transparentModal', animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: 'transparent' } } as const;

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
