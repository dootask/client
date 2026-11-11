import { Forward, MessagesSquare, Star } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useStore } from 'zustand';

import { useT } from '../../../i18n';
import { Icon, type LucideIcon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import type { SelectionBarProps } from './selectionBarTypes';

/** App 多选底栏（同旧版 SelectionBar）：转发 / 合并转发 / 收藏，未选中时整体置灰；「新任务」暂不放 */
export function SelectionBar({ selection, onForward, onMerge, onFavorite }: SelectionBarProps) {
  const t = useT();
  const ids = useStore(selection.store, (s) => s.ids);
  const disabled = ids.size === 0;
  const selected = () => [...ids].sort((a, b) => a - b);
  return (
    <View style={styles.bar}>
      <BarButton icon={Forward} label={t('messenger:action.forward')} disabled={disabled} onPress={() => onForward(selected(), false)} />
      <BarButton icon={MessagesSquare} label={t('messenger:forward.merge')} disabled={disabled} onPress={() => onMerge(selected())} />
      <BarButton icon={Star} label={t('messenger:action.favorite')} disabled={disabled} onPress={() => onFavorite(selected())} />
    </View>
  );
}

function BarButton({ icon, label, disabled, onPress }: { icon: LucideIcon; label: string; disabled: boolean; onPress: () => void }) {
  const { theme } = useUnistyles();
  const color = disabled ? theme.colors.text4 : theme.colors.text;
  return (
    <Touchable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon icon={icon} color={color} size={theme.size.icon} />
      <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  bar: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.separator,
    backgroundColor: theme.colors.surface,
  },
  button: {
    flex: 1,
    minHeight: theme.size.selectionBar,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs / 2,
  },
  pressed: { backgroundColor: theme.colors.fillPressed },
  label: { ...theme.typography.caption },
}));
