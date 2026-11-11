import { Forward } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useStore } from 'zustand';

import { useT } from '../../../i18n';
import { Icon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import type { SelectionBarProps } from './selectionBarTypes';

/** Web 多选栏（保持原样）：取消 · 已选 n 项 · 转发 */
export function SelectionBar({ selection, onForward }: SelectionBarProps) {
  const t = useT();
  const { theme } = useUnistyles();
  const ids = useStore(selection.store, (s) => s.ids);
  return (
    <View style={styles.selectBar}>
      <Touchable accessibilityRole="button" onPress={selection.clear} style={({ pressed, hovered }) => styles.barButton(pressed, hovered)}>
        <Text style={styles.barCancel}>{t('cancel')}</Text>
      </Touchable>
      <Text style={styles.barCount}>{t('messenger:selection.count', { n: ids.size })}</Text>
      <Touchable
        accessibilityRole="button"
        disabled={ids.size === 0}
        onPress={() => onForward([...ids].sort((a, b) => a - b), true)}
        style={({ pressed, hovered }) => styles.barButton(pressed, hovered)}
      >
        <Icon icon={Forward} color={ids.size ? theme.colors.primaryText : theme.colors.text4} size={theme.size.icon} />
        <Text style={styles.barForward(ids.size > 0)}>{t('messenger:action.forward')}</Text>
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  selectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.size.navBar,
    paddingHorizontal: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.separator,
    backgroundColor: theme.colors.surface,
  },
  barButton: (pressed: boolean, hovered: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.block,
    opacity: pressed ? theme.opacity.pressedIcon : 1,
    backgroundColor: hovered ? theme.colors.hover : 'transparent',
  }),
  barCancel: { ...theme.typography.callout, color: theme.colors.text2 },
  barCount: { ...theme.typography.callout, color: theme.colors.text, fontVariant: ['tabular-nums'] },
  barForward: (enabled: boolean) => ({ ...theme.typography.callout, fontWeight: '600', color: enabled ? theme.colors.primaryText : theme.colors.text4 }),
}));
