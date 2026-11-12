import type { ReactNode } from 'react';
import { Modal, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ToastHost } from '../../../ui/Toast';

export interface AiHistoryFrameProps { visible: boolean; onClose: () => void; children: ReactNode }

export function AiHistoryFrame({ visible, onClose, children }: AiHistoryFrameProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View testID="ai-history-panel" style={styles.root}>{children}<ToastHost /></View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, paddingTop: rt.insets.top, paddingBottom: rt.insets.bottom, backgroundColor: theme.colors.headerBg },
}));
