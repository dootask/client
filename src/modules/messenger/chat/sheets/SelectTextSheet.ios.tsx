import { TextInput } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import { Sheet } from '../../../../ui/layout';

/**
 * 选择文本：iOS 的可选文字只能整段复制，这里用只读的多行输入框，能拖动选区复制其中一部分
 */
export function SelectTextSheet({ text, visible, onClose }: { text: string; visible: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('messenger:action.selectText')} fill>
      <TextInput value={text} editable={false} multiline scrollEnabled style={styles.text} />
    </Sheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  text: {
    ...theme.typography.body,
    flex: 1,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.page,
    paddingBottom: theme.spacing.xl,
    textAlignVertical: 'top',
  },
}));
