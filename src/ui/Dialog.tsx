import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export interface DialogProps {
  title: string;
  /** 点遮罩、Web 上按 Esc、Android 上按返回键 */
  onClose: () => void;
  children: ReactNode;
}

/** 居中对话框：半透明遮罩 + 面板，键盘弹出时整体上移。只在打开时由调用方渲染 */
export function Dialog({ title, onClose, children }: DialogProps) {
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} accessible={false} />
        <View style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.page,
    paddingBottom: theme.spacing.page + rt.insets.ime,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  panel: {
    width: '100%',
    maxWidth: theme.size.dialogWidth,
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.popover,
  },
  title: {
    ...theme.typography.title2,
    color: theme.colors.text,
  },
}));
