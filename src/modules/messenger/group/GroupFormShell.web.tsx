import { useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { DooButton, DooModal } from '../../../ui/DooModal';
import type { GroupFormProps } from './GroupFormShell';

export function GroupFormShell({ title, confirmLabel, busy, disabled, onSave, onClose, children, width, testID }: GroupFormProps) {
  const t = useT();
  const { theme } = useUnistyles();
  return <DooModal visible title={title} width={width ?? theme.size.group.modal} onClose={onClose} testID={testID} footer={<><DooButton testID={testID && `${testID}-cancel`} label={t('cancel')} disabled={busy} onPress={onClose} /><DooButton testID={testID && `${testID}-confirm`} primary label={confirmLabel} disabled={busy || disabled} onPress={onSave} /></>}>{children}</DooModal>;
}
