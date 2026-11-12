import { Keyboard, Plus } from 'lucide-react-native';
import type { Insets, StyleProp, ViewStyle } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { useChat } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { Touchable, type TouchState } from '../../../ui/Touchable';

/** 加号（App）：开关加号面板（最近照片、相册、拍摄、文件）（Web 的加号在 Composer.web.tsx 里） */
export function AttachButton({ hitSlop, style }: { hitSlop: Insets; style: (state: TouchState) => StyleProp<ViewStyle> }) {
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
      <Icon icon={open ? Keyboard : Plus} color={theme.colors.text2} size={theme.size.composer.icon} />
    </Touchable>
  );
}
