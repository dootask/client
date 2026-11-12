import { Search } from 'lucide-react-native';
import { TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Icon } from '../../../ui/Icon';

export function MemberSearch({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  return <View style={styles.root}><View style={styles.icon}><Icon icon={Search} size={theme.size.group.searchIcon} color={theme.colors.searchIcon} /></View><TextInput testID="members-search" value={value} onChangeText={onChangeText} placeholder={t('messenger:search')} placeholderTextColor={theme.colors.placeholder} style={styles.input} /></View>;
}

const styles = StyleSheet.create((theme) => ({
  root: { height: theme.size.group.search, borderWidth: 1, borderColor: theme.colors.headerLine, borderRadius: theme.size.group.formRadius },
  icon: { position: 'absolute', width: theme.size.group.searchInset, height: '100%', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, paddingLeft: theme.size.group.searchInset, paddingRight: theme.size.group.searchPad, ...theme.typography.groupField, color: theme.colors.regularText },
}));
