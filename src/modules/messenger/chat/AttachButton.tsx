import { Keyboard, Plus } from 'lucide-react-native';
import { useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { useChat } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import type { AttachButtonProps } from './attachButtonTypes';

/** 加号（App）：开关加号面板（最近照片、相册、拍摄、文件）。Web 版是下拉菜单，见 AttachButton.web.tsx */
export function AttachButton({ hitSlop, style }: AttachButtonProps) {
  const t = useT();
  const { theme } = useUnistyles();
  const controller = useChat();
  const open = controller.activePanel === 'more';
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={t(open ? 'messenger:chat.keyboard' : 'messenger:chat.attach')}
      hitSlop={hitSlop}
      onPress={() => controller.togglePanel('more')}
      style={style}
    >
      <Icon icon={open ? Keyboard : Plus} color={theme.colors.text2} size={theme.size.icon} />
    </Touchable>
  );
}
