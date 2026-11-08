import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Image, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { IconButton } from '../../ui/IconButton';
import { KeyboardScroll } from '../../ui/KeyboardScroll';
import { entryHref, useSession } from '../session';
import { LanguageMenu } from '../setting';

const LOGO = require('../../../assets/icon.png');

/**
 * 登录前的页面（服务器、登录、升级提示）：应用图标 + 标题 + 表单，窄屏铺满，宽屏表单居中限宽。
 * 右上角切换语言；键盘弹起时表单可以滚上去
 */
export function AuthPage({ title, back = false, children }: { title: string; back?: boolean; children: ReactNode }) {
  const t = useT();
  return (
    <View style={styles.root}>
      <KeyboardScroll contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <View style={styles.header}>
            <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors />
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          </View>
          {children}
        </View>
      </KeyboardScroll>
      <View style={styles.bar}>
        {back && <IconButton icon={ChevronLeft} label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.replace(entryHref(useSession.getState())))} />}
        <View style={styles.barEnd}>
          <LanguageMenu />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: rt.insets.top + theme.size.navBar,
    paddingBottom: rt.insets.bottom + theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xxl,
  },
  form: {
    width: '100%',
    maxWidth: theme.size.formMaxWidth,
    alignSelf: 'center',
    gap: theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  logo: {
    width: theme.size.logo,
    height: theme.size.logo,
    borderRadius: theme.radius.card,
  },
  title: {
    ...theme.typography.title1,
    color: theme.colors.text,
    textAlign: 'center',
  },
  bar: {
    position: 'absolute',
    top: rt.insets.top,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    height: theme.size.navBar,
    flexDirection: 'row',
    alignItems: 'center',
  },
  barEnd: {
    marginLeft: 'auto',
  },
}));
