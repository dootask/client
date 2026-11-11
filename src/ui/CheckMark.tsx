import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon } from './Icon';
import { Touchable } from './Touchable';

/** 多选勾选圈（docs/ui-spec.md 第 5 节）：未选时 text4 描边圆圈，选中时品牌色实心加白勾 */
export function CheckMark({ checked }: { checked: boolean }) {
  const { theme } = useUnistyles();
  return <View style={styles.mark(checked)}>{checked && <Icon icon={Check} color={theme.colors.onPrimary} size={theme.size.checkMark - 8} />}</View>;
}

/** 勾选项：勾选圈加文字，整行可点（两端一致，不用平台开关） */
export function CheckOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <Touchable
      accessibilityRole="checkbox"
      aria-checked={checked}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => styles.option(pressed)}
    >
      <CheckMark checked={checked} />
      <Text style={styles.label}>{label}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  mark: (checked: boolean) => ({
    width: theme.size.checkMark,
    height: theme.size.checkMark,
    borderRadius: theme.radius.pill,
    borderWidth: checked ? 0 : 1.5,
    borderColor: theme.colors.text4,
    backgroundColor: checked ? theme.colors.primary : 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  option: (pressed: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.sm,
    minHeight: theme.size.touch,
    opacity: pressed ? theme.opacity.pressedIcon : 1,
  }),
  label: { ...theme.typography.callout, color: theme.colors.text2 },
}));
