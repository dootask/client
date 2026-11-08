import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { ListRow } from '../../ui/ListRow';
import { changeEnterSend, useEnterSend } from './enterSend';
import { newlineLabel } from './enterSendDefault';

/** 键盘：Enter 发送，或 Enter 换行（App 上点按钮发送，Web 上组合键发送），点了立即生效 */
export function KeyboardSettings() {
  const t = useT();
  const enterSend = useEnterSend();
  return (
    <ScrollView style={styles.root}>
      <ListRow title={t('setting:keyboard.enterSend')} accessory={enterSend ? 'check' : 'none'} onPress={() => changeEnterSend(true)} />
      <ListRow title={newlineLabel(t)} accessory={enterSend ? 'none' : 'check'} onPress={() => changeEnterSend(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
}));
