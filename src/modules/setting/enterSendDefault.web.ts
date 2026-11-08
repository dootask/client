import type { Translate } from '../../i18n';
import { shortcutLabel } from '../../ui/shortcuts';

/** Web、桌面：Enter 发送，Shift+Enter 换行 */
export const ENTER_SEND_DEFAULT = true;

export const newlineLabel = (t: Translate) => t('setting:keyboard.modEnterSend', { combo: shortcutLabel('mod+enter') });
