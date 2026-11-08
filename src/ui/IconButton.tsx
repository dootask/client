import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon, type LucideIcon } from './Icon';
import { Touchable } from './Touchable';

/** 导航栏等处的图标按钮：触控区按平台最小尺寸，按下降透明度，悬停叠一层底色 */
export function IconButton({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const { theme } = useUnistyles();
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed, hovered }) => styles.button(pressed, hovered)}>
      <Icon icon={icon} color={theme.colors.text} size={theme.size.icon} />
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: (pressed: boolean, hovered: boolean) => ({
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: pressed ? theme.opacity.pressedIcon : 1,
    backgroundColor: hovered ? theme.colors.hover : 'transparent',
  }),
}));
