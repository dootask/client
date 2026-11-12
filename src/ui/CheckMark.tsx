import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon } from './Icon';
import { Touchable } from './Touchable';

/** 多选勾选圈（docs/ui-spec.md 第 5 节）：未选时 text4 描边圆圈，选中时品牌色实心加白勾 */
export function CheckMark({ checked }: { checked: boolean }) {
  const { theme } = useUnistyles();
  return <View style={styles.mark(checked)}>{checked && <Icon icon={Check} color={theme.colors.onPrimary} size={theme.size.checkMark - 8} />}</View>;
}

/**
 * 旧版网页的圆形勾选（DooIcon Circle / CircleCheck solid）：未选是 offColor 描边圆圈，
 * 选中是品牌色实心圆加白勾；线宽 1.75 同旧版 DooIcon
 */
export function CircleCheck({ checked, size, offColor }: { checked: boolean; size: number; offColor: string }) {
  const { theme } = useUnistyles();
  const color = checked ? theme.colors.primary : offColor;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={10} stroke={color} fill={checked ? color : 'none'} />
      {checked && <Path d="m9 12 2 2 4-4" stroke={theme.colors.onPrimary} />}
    </Svg>
  );
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
