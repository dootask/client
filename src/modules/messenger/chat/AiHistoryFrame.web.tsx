import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { type CSSTransitionProperties } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { ToastHost } from '../../../ui/Toast';
import type { AiHistoryFrameProps } from './AiHistoryFrame';

const TRANSITION: CSSTransitionProperties = { transitionProperty: ['transform'], transitionDuration: 220, transitionTimingFunction: 'ease-out' };

export function AiHistoryFrame({ visible, onClose, children }: AiHistoryFrameProps) {
  const t = useT();
  const { rt } = useUnistyles();
  const narrow = rt.breakpoint === 'xs';
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(visible));
    return () => cancelAnimationFrame(frame);
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        {!narrow && <Pressable style={styles.mask} onPress={onClose} accessibilityLabel={t('close')} />}
        <Animated.View testID="ai-history-panel" style={[styles.panel(narrow, shown), TRANSITION]}>{children}</Animated.View>
        <ToastHost />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, alignItems: 'flex-end' },
  mask: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.modalMask },
  panel: (narrow: boolean, shown: boolean) => ({
    width: narrow ? '100%' : theme.size.aiHistory.width,
    height: '100%',
    backgroundColor: narrow ? theme.colors.headerBg : theme.colors.surface,
    transform: narrow ? [{ translateY: shown ? '0%' : '100%' }] : [{ translateX: shown ? '0%' : '100%' }],
  }),
}));
