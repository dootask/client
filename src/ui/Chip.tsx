import { Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Touchable } from './Touchable';

/** 选项胶囊（快捷选择一行排开、放不下换行）：选中时品牌色浅底加描边 */
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Touchable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={({ pressed, hovered }) => styles.chip(active, pressed, hovered)}
    >
      <Text style={styles.label(active)}>{label}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: (active: boolean, pressed: boolean, hovered: boolean) => ({
    height: theme.size.option,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: active ? theme.colors.primary : 'transparent',
    backgroundColor: active ? theme.colors.primarySoft : pressed ? theme.colors.fillPressed : hovered ? theme.colors.fillButton : theme.colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  }),
  label: (active: boolean) => ({ ...theme.typography.subhead, color: active ? theme.colors.primaryText : theme.colors.text }),
}));
