import { Stack } from 'expo-router';
import { X } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Icon } from '../../../ui/Icon';
import { SIDE_PAGE_OPTIONS } from '../../../ui/layout';
import { Touchable } from '../../../ui/Touchable';
import { closeProfile } from './navigation';
import type { ProfileFrameProps } from './ProfileFrame';

/**
 * 资料页外框（网页，同旧版 UserDetail）：居中卡片弹层，点卡片外或右上关闭。
 * 路由透明呈现、下层页面照常显示；用弹层（Modal）而不是普通页面，从会话抽屉（同样是弹层）里打开时才能盖在抽屉上面
 */
export function ProfileFrame({ children }: ProfileFrameProps) {
  const t = useT();
  const { theme } = useUnistyles();
  return (
    <>
      <Stack.Screen options={SIDE_PAGE_OPTIONS} />
      <Modal visible transparent animationType="fade" onRequestClose={closeProfile}>
        <View style={styles.root}>
          <Pressable style={styles.mask} onPress={closeProfile} accessibilityLabel={t('close')} />
          <View testID="profile-card" style={styles.card}>
            {children}
            <Touchable style={styles.close} onPress={closeProfile} accessibilityLabel={t('close')}>
              <Icon icon={X} color={theme.colors.descText} size={theme.size.iconSmall} />
            </Touchable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.size.profile.cardInset },
  mask: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.modalMask },
  card: {
    width: '100%',
    maxWidth: theme.size.profile.card,
    maxHeight: theme.size.profile.cardMax,
    overflow: 'hidden',
    borderRadius: theme.radius.profileCard,
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.modal,
  },
  close: {
    position: 'absolute',
    top: theme.size.sidePage.closeInset,
    right: theme.size.sidePage.closeInset,
    width: theme.size.sidePage.close,
    height: theme.size.sidePage.close,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
