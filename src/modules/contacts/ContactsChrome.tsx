import { CaseUpper, Search, UsersRound } from 'lucide-react-native';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { Icon } from '../../ui/Icon';
import { Tooltip } from '../../ui/popover';
import { Touchable } from '../../ui/Touchable';

export const ContactsSearch = memo(function ContactsSearch({ narrow, keyword, onSearch, toggle }: { narrow: boolean; keyword: string; onSearch: (word: string) => void; toggle?: React.ReactNode }) {
  const t = useT();
  const { theme } = useUnistyles();
  const [value, setValue] = useState(keyword);
  useEffect(() => setValue(keyword), [keyword]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const change = useCallback((next: string) => {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(next.trim()), 600);
  }, [onSearch]);
  return (
    <View style={styles.search(narrow)}>
      <View style={styles.box(narrow)}>
        <View style={styles.pre(narrow)}><Icon icon={Search} size={theme.size.dialogChrome.icon} color={narrow ? theme.colors.headerSearchIcon : theme.colors.searchIcon} /></View>
        <TextInput testID="contacts-search" accessibilityLabel={t('messenger:search')} value={value} onChangeText={change} placeholder={t('messenger:search')} placeholderTextColor={theme.colors.placeholder} autoCorrect={false} autoCapitalize="none" returnKeyType="search" style={styles.input} />
      </View>
      {toggle}
    </View>
  );
});

export const ContactsToggle = memo(function ContactsToggle({ narrow, mode, onPress }: { narrow: boolean; mode: 'letter' | 'department'; onPress: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const label = mode === 'letter' ? t('messenger:contacts.byDepartment') : t('messenger:contacts.byLetter');
  const button = <Touchable testID="contacts-toggle" accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.toggle(narrow)}><Icon icon={mode === 'letter' ? UsersRound : CaseUpper} size={theme.size.contacts.toggleIcon} color={narrow ? theme.colors.contactsToggle : theme.colors.searchIcon} /></Touchable>;
  return narrow ? button : <Tooltip label={label}>{button}</Tooltip>;
});

const styles = StyleSheet.create((theme) => ({
  search: (narrow: boolean) => ({ height: theme.size.dialogSearchRow, flexDirection: 'row', alignItems: 'center', paddingHorizontal: narrow ? theme.spacing.lg : theme.spacing.md, ...(narrow && { paddingTop: theme.spacing.md, paddingBottom: theme.size.dialogChrome.searchPadBottom, backgroundColor: theme.colors.headerBg }) }),
  box: (narrow: boolean) => ({ flex: 1, height: narrow ? theme.size.dialogSearchNarrow : theme.size.dialogSearch, flexDirection: 'row', alignItems: 'center', marginHorizontal: narrow ? 0 : theme.spacing.xs, paddingLeft: narrow ? theme.size.dialogChrome.searchInsetNarrow : theme.size.dialogChrome.searchInset, paddingRight: theme.size.dialogChrome.searchInset, borderRadius: narrow ? theme.radius.dialogSearchNarrow : theme.radius.dialogSearch, backgroundColor: narrow ? theme.colors.surface : theme.colors.searchFill }),
  pre: (narrow: boolean) => ({ width: narrow ? theme.size.dialogSearchPreNarrow : theme.size.dialogSearchPre, height: theme.size.dialogSearch, marginRight: -theme.size.dialogChrome.searchInset, alignItems: 'center', justifyContent: 'center' }),
  input: { flex: 1, minWidth: 0, height: theme.size.dialogSearch, fontSize: theme.typography.contactsName.fontSize, fontWeight: theme.typography.contactsName.fontWeight, color: theme.colors.regularText, paddingVertical: theme.spacing.xs, paddingHorizontal: theme.size.dialogChrome.inputPad, borderRadius: theme.radius.menu, outlineWidth: 0, outlineStyle: 'solid' },
  toggle: (narrow: boolean) => ({ width: narrow ? theme.size.contacts.toggleNarrow : theme.size.contacts.toggle, height: theme.size.contacts.toggleNarrow, alignItems: 'center', justifyContent: 'center', borderRadius: narrow ? theme.radius.block : theme.size.contacts.toggleRadius, ...(narrow && { backgroundColor: theme.colors.surface }) }),
}));
