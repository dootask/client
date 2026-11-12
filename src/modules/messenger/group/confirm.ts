import { Alert } from 'react-native';

import type { LayerConfirmOptions } from '../../../ui/LayerConfirm';

export function confirmGroup({ title, message, okLabel, cancelLabel, tone, onOk }: LayerConfirmOptions) {
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: okLabel, style: tone === 'danger' ? 'destructive' : 'default', onPress: onOk },
  ]);
}
