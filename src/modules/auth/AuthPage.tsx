import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { IconButton } from '../../ui/IconButton';

const LOGO = require('../../../assets/icon.png');

/**
 * 登录前的页面（服务器、登录、升级提示）：应用图标 + 标题 + 表单，窄屏铺满，宽屏表单居中限宽。
 * 键盘弹起时底部让出键盘高度，表单可以滚上去
 */
export function AuthPage({ title, back = false, children }: { title: string; back?: boolean; children: ReactNode }) {
  const t = useT();
  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <View style={styles.header}>
            <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors />
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          </View>
          {children}
        </View>
      </ScrollView>
      {back && (
        <View style={styles.back}>
          <IconButton icon={ChevronLeft} label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scroll: {
    flex: 1,
    marginBottom: rt.insets.ime,
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
  back: {
    position: 'absolute',
    top: rt.insets.top,
    left: theme.spacing.sm,
    height: theme.size.navBar,
    justifyContent: 'center',
  },
}));
