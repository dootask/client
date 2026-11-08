import { Bell, BellOff, CheckCheck, EyeOff, MailWarning, Palette, Pin, PinOff } from 'lucide-react-native';
import { useMemo } from 'react';

import { useT } from '../../i18n';
import { dialogUnread, type StoredDialog } from '../../sync/messenger';
import { confirmOnApp, type MenuEntry } from '../../ui/popover';
import { showToast } from '../../ui/Toast';
import { useErrorText } from '../session';
import { colorName, DIALOG_COLORS, type DialogColorName } from './colors';
import { useMessenger } from './hooks';

const COLOR_LABELS = {
  yellow: 'messenger:color.yellow',
  blue: 'messenger:color.blue',
  green: 'messenger:color.green',
  pink: 'messenger:color.pink',
  purple: 'messenger:color.purple',
} as const satisfies Record<DialogColorName, string>;

/** 会话行的长按 / 右键菜单（L5–L10），同一份数据在 App 交给系统菜单、在 Web 上自绘 */
export function useDialogMenu(d: StoredDialog | undefined): readonly MenuEntry[] {
  const t = useT();
  const messenger = useMessenger();
  const errorText = useErrorText();
  const id = d?.id ?? 0;
  const top = !!d?.top_at;
  const unread = d ? dialogUnread(d, true) > 0 : false;
  const silence = !!d?.silence;
  // 系统群（全员群、部门群等）的免打扰由服务端控制，不给改
  const silenceLocked = d?.type === 'group' && d.group_type !== 'user';
  const color = colorName(d?.color);

  return useMemo(() => {
    if (!messenger || !id) return [];
    const run = (task: () => Promise<unknown>) => () => void task().catch((err) => showToast(errorText(err)));
    const hide = run(() => messenger.hideDialog(id));
    const setColor = (value: string) => run(() => messenger.setColor(id, value));
    return [
      { label: t(top ? 'messenger:menu.untop' : 'messenger:menu.top'), icon: top ? PinOff : Pin, onSelect: run(() => messenger.toggleTop(id)) },
      {
        label: t(unread ? 'messenger:menu.read' : 'messenger:menu.unread'),
        icon: unread ? CheckCheck : MailWarning,
        onSelect: run(() => messenger.markDialog(id, unread ? 'read' : 'unread')),
      },
      {
        label: t(silence ? 'messenger:menu.unsilence' : 'messenger:menu.silence'),
        icon: silence ? Bell : BellOff,
        disabled: silenceLocked,
        onSelect: run(() => messenger.setSilence(id, !silence)),
      },
      {
        label: t('messenger:menu.color'),
        icon: Palette,
        children: [
          { label: t('messenger:color.default'), checked: !color, onSelect: setColor('') },
          'separator',
          ...DIALOG_COLORS.map((c) => ({ label: t(COLOR_LABELS[c.name]), checked: color === c.name, onSelect: setColor(c.value) })),
        ],
      },
      'separator',
      {
        label: t('messenger:menu.hide'),
        icon: EyeOff,
        // 置顶的会话不能隐藏
        disabled: top,
        onSelect: () => confirmOnApp({ title: t('messenger:menu.hide'), message: t('messenger:menu.hideTip'), confirmLabel: t('messenger:menu.hideAction'), cancelLabel: t('cancel'), onConfirm: hide }),
      },
    ];
  }, [messenger, id, top, unread, silence, silenceLocked, color, t, errorText]);
}
