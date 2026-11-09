import { FolderOpen, Images, Plus } from 'lucide-react-native';
import { useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Icon } from '../../../ui/Icon';
import { Menu } from '../../../ui/popover';
import type { AttachButtonProps } from './attachButtonTypes';

/** 加号（Web）：下拉菜单选图片视频或文件；也可以直接拖进聊天区、粘贴进输入框 */
export function AttachButton({ attach, style }: AttachButtonProps) {
  const t = useT();
  const { theme } = useUnistyles();
  return (
    <Menu
      accessibilityLabel={t('messenger:chat.attach')}
      items={[
        { label: t('messenger:chat.media'), icon: Images, onSelect: () => attach.pick('media') },
        { label: t('messenger:chat.file'), icon: FolderOpen, onSelect: () => attach.pick('file') },
      ]}
      style={style}
    >
      <Icon icon={Plus} color={theme.colors.text2} size={theme.size.icon} />
    </Menu>
  );
}
