import { ChevronLeft } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useStore } from 'zustand';

import { useT } from '../../../i18n';
import { Icon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import { ChatBanners } from './ChatBanners';
import { ChatHeader } from './ChatHeader';
import type { ChatTopBarProps } from './chatTopBarTypes';
import type { Selection } from './selection';

/** App 聊天页顶部：多选时换成「已选 n 条」+ 右侧「取消」，返回键退出多选，横条不显示 */
export function ChatTopBar({ dialogId, dialog, selection, onJump, onSessionChanged }: ChatTopBarProps) {
  const active = useStore(selection.store, (s) => s.active);
  if (active) return <SelectionHeader selection={selection} />;
  return (
    <ChatHeader dialogId={dialogId} dialog={dialog} onSessionChanged={onSessionChanged}>
      <ChatBanners dialog={dialog} onJump={onJump} />
    </ChatHeader>
  );
}

function SelectionHeader({ selection }: { selection: Selection }) {
  const t = useT();
  const { theme } = useUnistyles();
  const count = useStore(selection.store, (s) => s.ids.size);
  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <View style={styles.side}>
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            hitSlop={theme.spacing.sm}
            onPress={selection.clear}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Icon icon={ChevronLeft} color={theme.colors.text} size={theme.size.icon} />
          </Touchable>
        </View>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{t('messenger:selection.title', { n: count })}</Text>
        </View>
        <View style={[styles.side, styles.sideRight]}>
          <Touchable
            accessibilityRole="button"
            hitSlop={theme.spacing.sm}
            onPress={selection.clear}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.cancel}>{t('cancel')}</Text>
          </Touchable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    paddingTop: rt.insets.top,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  bar: {
    height: theme.size.navBar,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end' },
  center: { flexShrink: 1, maxWidth: '64%', alignItems: 'center' },
  back: { width: theme.size.touch, height: theme.size.touch, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: theme.opacity.pressedIcon },
  title: { ...theme.typography.title2, color: theme.colors.text, flexShrink: 1 },
  cancel: { ...theme.typography.body, color: theme.colors.text },
}));
