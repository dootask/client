import { ScrollView, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import { Sheet } from '../../../../ui/layout';

/** 选择文本：整段铺开，长按拖动选区复制其中一部分（Android 的可选文字自带选区手柄） */
export function SelectTextSheet({ text, visible, onClose }: { text: string; visible: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('messenger:action.selectText')} fill>
      <ScrollView contentContainerStyle={styles.body}>
        <Text selectable style={styles.text}>
          {text}
        </Text>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  body: { paddingHorizontal: theme.spacing.page, paddingBottom: theme.spacing.xl },
  text: { ...theme.typography.body, color: theme.colors.text },
}));
