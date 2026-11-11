import { Bell, BellOff, EyeOff, MessageSquare, MessageSquareDot, Pin, PinOff } from 'lucide-react-native';
import { useMemo } from 'react';
import { useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { dialogUnread, type StoredDialog } from '../../sync/messenger';
import type { MenuEntry } from '../../ui/popover';
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

/**
 * 会话行的右键 / 长按菜单（L5–L10），项目和顺序同旧版：置顶、标记已读 / 未读、免打扰、不显示该会话，
 * 分隔线下是 6 个颜色（默认 + 5 色），当前颜色打勾。各端都自绘（旧 App 这里也是网页菜单）
 */
export function useDialogMenu(d: StoredDialog | undefined): readonly MenuEntry[] {
  const t = useT();
  const { theme } = useUnistyles();
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
    const setColor = (value: string) => run(() => messenger.setColor(id, value));
    const swatches = theme.palette.markSwatch;
    return [
      { label: t(top ? 'messenger:menu.untop' : 'messenger:menu.top'), icon: top ? PinOff : Pin, onSelect: run(() => messenger.toggleTop(id)) },
      {
        label: t(unread ? 'messenger:menu.read' : 'messenger:menu.unread'),
        icon: unread ? MessageSquare : MessageSquareDot,
        onSelect: run(() => messenger.markDialog(id, unread ? 'read' : 'unread')),
      },
      {
        label: t(silence ? 'messenger:menu.unsilence' : 'messenger:menu.silence'),
        icon: silence ? Bell : BellOff,
        disabled: silenceLocked,
        onSelect: run(() => messenger.setSilence(id, !silence)),
      },
      // 置顶的会话不能隐藏
      { label: t('messenger:menu.hide'), icon: EyeOff, disabled: top, onSelect: run(() => messenger.hideDialog(id)) },
      'separator',
      { label: t('messenger:color.default'), swatch: swatches.default, checked: !color, onSelect: setColor('') },
      ...DIALOG_COLORS.map((c) => ({ label: t(COLOR_LABELS[c.name]), swatch: swatches[c.name], checked: color === c.name, onSelect: setColor(c.value) })),
    ];
  }, [messenger, id, top, unread, silence, silenceLocked, color, t, errorText, theme]);
}
