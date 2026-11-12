import { Linking, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Touchable } from '../../../ui/Touchable';
import { usePhone } from './phone';

const dial = (tel: string) => Linking.openURL(`tel:${tel}`);

export function PhoneRow({ userid }: { userid: number }) {
  const t = useT();
  const phone = usePhone(userid, dial);
  return <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:group.info.phoneAction')} disabled={phone.busy} onPress={phone.open} style={styles.row}>
    <Text style={styles.label}>{t('messenger:group.info.phone')}</Text>
    <Text style={styles.value} numberOfLines={1}>{phone.tel}</Text>
  </Touchable>;
}

const styles = StyleSheet.create((theme) => ({
  row: { minHeight: theme.size.rowSingle, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
  label: { flex: 1, ...theme.typography.body, color: theme.colors.text },
  value: { ...theme.typography.callout, color: theme.colors.text3 },
}));
