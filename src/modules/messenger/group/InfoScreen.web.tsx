import { router, useLocalSearchParams } from 'expo-router';
import { SquarePen } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Icon } from '../../../ui/Icon';
import { SidePage } from '../../../ui/layout';
import { Touchable } from '../../../ui/Touchable';
import { GroupForms } from './GroupForms';
import { MembersContent } from './MembersContent';
import { closeGroupPage, useGroupManage } from './useGroup';
import { groupTypeText } from './typeText';

export function InfoRoute() {
  const { dialogId } = useLocalSearchParams<{ dialogId: string }>();
  return <InfoScreen dialogId={Number(dialogId)} />;
}

function InfoScreen({ dialogId }: { dialogId: number }) {
  const t = useT();
  const { theme } = useUnistyles();
  const { d, can } = useGroupManage(dialogId);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (d?.type === 'user') router.replace({ pathname: '/user/[userid]', params: { userid: d.dialog_user?.userid ?? 0 } });
  }, [d?.type, d?.dialog_user?.userid]);
  if (d?.type === 'user') return null;
  return <SidePage title={t('messenger:group.info.title')} testID="info-panel" onClose={() => closeGroupPage(dialogId)}>
    <View style={styles.head}>
      <Text style={styles.label}>{t('messenger:group.info.groupName')}</Text>
      <View style={styles.nameRow}><Text testID="info-value-name" style={styles.value} numberOfLines={1}>{d?.name ?? ''}</Text>{can.edit && <Touchable testID="info-edit" onPress={() => setEditing(true)} accessibilityLabel={t('messenger:group.info.edit')}><Icon icon={SquarePen} color={theme.colors.regularText} size={theme.size.iconSmall} /></Touchable>}</View>
      <Text style={styles.label}>{t('messenger:group.info.id')}</Text>
      <Text testID="info-value-id" style={styles.value} selectable>{dialogId}</Text>
      <Text style={styles.label}>{t('messenger:group.info.type')}</Text>
      <Text testID="info-value-type" style={styles.value}>{groupTypeText(d?.group_type, t)}</Text>
    </View>
    <MembersContent dialogId={dialogId} />
    {editing && <GroupForms dialogId={dialogId} kind="edit" members={[]} onClose={() => setEditing(false)} />}
  </SidePage>;
}

const styles = StyleSheet.create((theme) => ({
  head: { paddingTop: theme.size.group.top, paddingHorizontal: theme.size.group.fieldX },
  label: { ...theme.typography.groupField, color: theme.colors.groupLabel, marginTop: theme.size.group.fieldTop },
  value: { ...theme.typography.groupValue, color: theme.colors.regularText, marginTop: theme.size.group.valueTop, flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingRight: theme.size.group.action },
}));
