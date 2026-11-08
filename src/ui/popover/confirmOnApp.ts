import { Alert } from 'react-native';

export interface ConfirmOnAppOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/** 菜单里的操作要确认时用：App 弹系统确认框（菜单已经收起，没有可锚的按钮）；Web 上右键菜单本身就是确认，直接执行 */
export function confirmOnApp({ title, message, confirmLabel, cancelLabel, destructive, onConfirm }: ConfirmOnAppOptions) {
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
