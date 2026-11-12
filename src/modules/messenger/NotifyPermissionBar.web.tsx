import { useFocusEffect } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { browserNotificationsSupported, notificationEnabled, openAppSettings } from '../../platform/notifications.web';
import { Icon } from '../../ui/Icon';
import { showToast } from '../../ui/Toast';
import { Touchable } from '../../ui/Touchable';

export function NotifyPermissionBar({ narrow }: { narrow: boolean }) {
  const t = useT();
  const { theme } = useUnistyles();
  const [enabled, setEnabled] = useState(true);
  useFocusEffect(useCallback(() => {
    const check = () => setEnabled(!browserNotificationsSupported() || Notification.permission === 'granted');
    check();
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []));
  if (enabled) return null;
  const request = async () => {
    if (Notification.permission === 'denied') {
      showToast(t('messenger:notify.denied'));
      return;
    }
    await openAppSettings();
    setEnabled(await notificationEnabled());
  };
  return (
    <Touchable testID="notify-permission" accessibilityRole="button" onPress={request} style={styles.bar(narrow)}>
      <Text style={styles.text}>{t('messenger:notify.permission')}</Text>
      <Icon icon={ChevronRight} size={theme.size.noticeIcon} color={theme.colors.pageText} />
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  bar: (narrow: boolean) => ({
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.noticeFill, borderColor: theme.colors.noticeLine,
    ...(narrow
      ? { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, borderBottomWidth: 1 }
      : { paddingVertical: theme.size.noticePadY, paddingHorizontal: theme.spacing.md, marginVertical: theme.spacing.sm, marginHorizontal: theme.spacing.md, borderWidth: 1, borderRadius: theme.radius.notice }),
  }),
  text: { ...theme.typography.notice, color: theme.colors.pageText },
}));
