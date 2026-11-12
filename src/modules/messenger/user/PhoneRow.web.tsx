import { Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Touchable } from '../../../ui/Touchable';
import { usePhone } from './phone';

const showNumber = () => Promise.resolve();

export function PhoneRow({ userid }: { userid: number }) {
  const t = useT();
  const phone = usePhone(userid, showNumber);
  return <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:group.info.phoneView')} disabled={phone.busy} onPress={phone.open} style={styles.row}>
    <Text style={styles.label}>{t('messenger:group.info.phone')}</Text>
    <Text style={styles.value} numberOfLines={1} selectable>{phone.tel}</Text>
  </Touchable>;
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, gap: theme.spacing.sm },
  label: { ...theme.typography.groupField, width: theme.size.group.phoneLabel, color: theme.colors.descText },
  value: { ...theme.typography.phoneNumber, color: theme.colors.titleText, flexShrink: 1 },
}));
