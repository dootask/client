import type { ReactNode } from 'react';

import { Sheet } from '../../../ui/layout';

export interface GroupFormProps {
  title: string;
  confirmLabel: string;
  busy: boolean;
  disabled: boolean;
  onSave: () => void;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  /** 弹窗 testID；网页的取消、确定按钮是 `<testID>-cancel`、`<testID>-confirm` */
  testID?: string;
}

export function GroupFormShell({ title, confirmLabel, busy, disabled, onSave, onClose, children }: GroupFormProps) {
  return <Sheet visible title={title} onClose={onClose} confirm={{ label: confirmLabel, busy, disabled, onPress: onSave }}>{children}</Sheet>;
}
