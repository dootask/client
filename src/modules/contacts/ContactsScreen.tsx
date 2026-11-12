import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ListDetail, useSplitView } from '../../ui/layout';
import { ContactsList } from './ContactsList';

export function ContactsScreen() {
  const split = useSplitView();
  return <ListDetail list={<ContactsList />} dialog>{split ? <View style={styles.empty} /> : <ContactsList />}</ListDetail>;
}

const styles = StyleSheet.create((theme) => ({ empty: { flex: 1, backgroundColor: theme.colors.surface } }));
