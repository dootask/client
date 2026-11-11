import { useFocusEffect } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { AppState, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { notificationEnabled, openAppSettings } from '../../platform/notifications';
import { Icon } from '../../ui/Icon';
import { Touchable } from '../../ui/Touchable';

/** 系统通知权限：列表页每次显示、App 每次回到前台都重新查（同旧版 activated + 首页恢复时查询）；没查到之前算开着 */
function useNotificationEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const check = () => void notificationEnabled().then((value) => alive && setEnabled(value));
      check();
      const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
      return () => {
        alive = false;
        sub.remove();
      };
    }, []),
  );
  return enabled;
}

/**
 * 会话列表顶部的「未开启通知权限 >」（同旧版 messenger-notify-permission），点了去系统设置。
 * 只在 App 上、没开通知时出现；窄屏通栏，宽屏是带圆角的卡片
 */
export function NotifyPermissionBar({ narrow }: { narrow: boolean }) {
  const t = useT();
  const { theme } = useUnistyles();
  const enabled = useNotificationEnabled();
  if (enabled) return null;
  return (
    <Touchable testID="notify-permission" accessibilityRole="button" onPress={openAppSettings} style={styles.bar(narrow)}>
      <Text style={styles.text}>{t('messenger:notifyOff')}</Text>
      <Icon icon={ChevronRight} size={theme.size.noticeIcon} color={theme.colors.pageText} />
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  bar: (narrow: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.noticeFill,
    borderColor: theme.colors.noticeLine,
    ...(narrow
      ? { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, borderBottomWidth: 1 }
      : {
          paddingVertical: theme.size.noticePadY,
          paddingHorizontal: theme.spacing.md,
          marginVertical: theme.spacing.sm,
          marginHorizontal: theme.spacing.md,
          borderWidth: 1,
          borderRadius: theme.radius.notice,
        }),
  }),
  text: {
    ...theme.typography.notice,
    color: theme.colors.pageText,
  },
}));
