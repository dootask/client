import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Switch } from './Switch';
import { Touchable } from './Touchable';

/** 一行文字 + 右侧开关（平台原生开关，白色滑块、打开时品牌色轨道）；点整行都能切换 */
export function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const { theme } = useUnistyles();
  return (
    <Touchable
      accessibilityRole="switch"
      aria-checked={value}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      style={styles.row}
    >
      <Text style={styles.label}>{label}</Text>
      {/* 开关只负责显示，点按都交给整行：不然点开关本身在 Web 上会切换两次 */}
      <View style={styles.display} importantForAccessibility="no-hide-descendants">
        <Switch value={value} thumbColor={theme.colors.onPrimary} trackColor={{ false: theme.colors.fillPressed, true: theme.colors.primary }} />
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, minHeight: theme.size.control },
  label: { ...theme.typography.body, flex: 1, color: theme.colors.text },
  display: { pointerEvents: 'none' },
}));
