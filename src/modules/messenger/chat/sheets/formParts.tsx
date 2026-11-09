import { Plus, X } from 'lucide-react-native';
import { Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon } from '../../../../ui/Icon';
import { Touchable } from '../../../../ui/Touchable';

/** 列表末尾「添加一项」的整行按钮 */
export function AddRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useUnistyles();
  return (
    <Touchable accessibilityRole="button" onPress={onPress} style={({ pressed, hovered }) => styles.add(pressed, hovered)}>
      <Icon icon={Plus} color={theme.colors.primaryText} size={theme.size.iconSmall} />
      <Text style={styles.addText}>{label}</Text>
    </Touchable>
  );
}

/** 输入框右侧的删除这一项 */
export function RemoveButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useUnistyles();
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => styles.remove(pressed)}>
      <Icon icon={X} color={theme.colors.text3} size={theme.size.iconSmall} />
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  add: (pressed: boolean, hovered: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.size.control,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.block,
    backgroundColor: pressed ? theme.colors.fillPressed : hovered ? theme.colors.hover : 'transparent',
  }),
  addText: { ...theme.typography.body, color: theme.colors.primaryText },
  remove: (pressed: boolean) => ({
    width: theme.size.touch,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: pressed ? theme.opacity.pressedIcon : 1,
  }),
}));
