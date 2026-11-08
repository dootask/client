import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { LANGUAGES, useLanguage } from '../../i18n';
import { ListRow } from '../../ui/ListRow';
import { changeLanguage } from './preferences';

/** 界面语言：语言名用各自的写法，点了立即生效 */
export function LanguageSettings() {
  const language = useLanguage();
  return (
    <ScrollView style={styles.root}>
      {LANGUAGES.map((item) => (
        <ListRow key={item.code} title={item.name} accessory={item.code === language ? 'check' : 'none'} onPress={() => void changeLanguage(item.code)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
}));
