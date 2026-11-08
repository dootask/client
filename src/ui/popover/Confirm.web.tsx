import { useEffect, useRef, useState } from 'react';
import { type HostInstance, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { Touchable } from '../Touchable';
import { Layer, measureAnchor, Positioned } from './Layer';
import type { Rect } from './position';
import type { ConfirmProps } from './types';

/** Web / 桌面：锚在触发元素旁的确认气泡。点外面、按 Esc 取消，按回车确认 */
export function Confirm({ title, message, confirmLabel, destructive = false, onConfirm, accessibilityLabel, style, children }: ConfirmProps) {
  const ref = useRef<HostInstance>(null);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  return (
    <>
      <Touchable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={async () => setAnchor(await measureAnchor(ref.current))}
        style={style}
      >
        {children}
      </Touchable>
      {anchor && (
        <ConfirmBubble
          anchor={anchor}
          title={title}
          message={message}
          confirmLabel={confirmLabel}
          destructive={destructive}
          onClose={() => setAnchor(null)}
          onConfirm={() => {
            setAnchor(null);
            onConfirm();
          }}
        />
      )}
    </>
  );
}

interface BubbleProps {
  anchor: Rect;
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function ConfirmBubble({ anchor, title, message, confirmLabel, destructive, onClose, onConfirm }: BubbleProps) {
  const t = useT();
  // 打开时焦点放在确认按钮上：回车确认；Tab 切到取消再回车就是取消，不会两个都触发
  const confirmRef = useRef<HostInstance>(null);
  useEffect(() => confirmRef.current?.focus(), []);
  return (
    <Layer onClose={onClose}>
      <Positioned anchor={anchor} align="center">
        <View style={styles.bubble} accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          {message !== undefined && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            <Touchable accessibilityRole="button" onPress={onClose} style={({ hovered }) => styles.button('cancel', hovered)}>
              <Text style={styles.buttonText('cancel')}>{t('cancel')}</Text>
            </Touchable>
            <Touchable ref={confirmRef} accessibilityRole="button" onPress={onConfirm} style={({ hovered }) => styles.button(destructive ? 'danger' : 'primary', hovered)}>
              <Text style={styles.buttonText(destructive ? 'danger' : 'primary')}>{confirmLabel ?? t('confirm')}</Text>
            </Touchable>
          </View>
        </View>
      </Positioned>
    </Layer>
  );
}

type Kind = 'cancel' | 'primary' | 'danger';

const styles = StyleSheet.create((theme) => ({
  bubble: {
    maxWidth: theme.size.bubbleMaxWidth,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  title: {
    ...theme.typography.subhead,
    fontWeight: '600',
    color: theme.colors.text,
  },
  message: {
    ...theme.typography.footnote,
    color: theme.colors.text2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  button: (kind: Kind, hovered: boolean) => ({
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.bubbleTight,
    backgroundColor: kind === 'cancel' ? theme.colors.fillButton : kind === 'danger' ? theme.colors.danger : theme.colors.primary,
    opacity: hovered ? theme.opacity.pressedPrimary : 1,
  }),
  buttonText: (kind: Kind) => ({
    ...theme.typography.footnote,
    fontWeight: '500',
    color: kind === 'cancel' ? theme.colors.text : theme.colors.onPrimary,
  }),
}));
