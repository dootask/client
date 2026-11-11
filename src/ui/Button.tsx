import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Touchable } from './Touchable';

/** 等结果超过这么久才转圈，免得立刻回来的结果闪一下（docs/ui-spec.md 对话框一节） */
const SPINNER_DELAY = 150;

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /** primary：整行主色按钮；plain：主色文字按钮 */
  variant?: 'primary' | 'plain';
  /** 等结果期间：不能再点，超过 150ms 转圈 */
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false }: ButtonProps) {
  const { theme } = useUnistyles();
  const [spinning, setSpinning] = useState(false);
  if (!loading && spinning) setSpinning(false);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSpinning(true), SPINNER_DELAY);
    return () => clearTimeout(timer);
  }, [loading]);

  const color = variant === 'primary' ? theme.colors.onPrimary : theme.colors.primaryText;
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled} aria-busy={loading}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed, hovered }) => styles.button(variant, pressed || hovered, disabled)}
    >
      {spinning ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={styles.label(color)} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: (variant: 'primary' | 'plain', active: boolean, disabled: boolean) => ({
    height: variant === 'primary' ? theme.size.control : theme.size.touch,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: variant === 'primary' ? theme.colors.primary : 'transparent',
    opacity: disabled ? theme.opacity.disabled : active ? theme.opacity.pressedPrimary : 1,
  }),
  label: (color: string) => ({
    ...theme.typography.callout,
    fontWeight: '600',
    color,
  }),
}));
