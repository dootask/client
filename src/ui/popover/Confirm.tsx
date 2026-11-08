import { Alert } from 'react-native';

import { useT } from '../../i18n';
import { Touchable } from '../Touchable';
import type { ConfirmProps } from './types';

/** App：点击后弹系统确认框 */
export function Confirm({ title, message, confirmLabel, destructive, onConfirm, accessibilityLabel, style, children }: ConfirmProps) {
  const t = useT();
  const ask = () =>
    Alert.alert(title, message, [
      { text: t('cancel'), style: 'cancel' },
      { text: confirmLabel ?? t('confirm'), style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ]);
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={ask} style={style}>
      {children}
    </Touchable>
  );
}
