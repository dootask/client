import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useStore } from 'zustand';

import { useT } from '../../../i18n';
import { Touchable } from '../../../ui/Touchable';
import { SELECTION_MAX } from './selection';
import type { SelectionBarProps } from './selectionBarTypes';

/**
 * Web 多选操作条（旧版 .dialog-multi-select-bar）：顶替输入区，左边「已选N条」（到上限加红字提示），
 * 右边「转发」「取消」两个 iView 小按钮；转发默认逐条
 */
export function SelectionBar({ selection, onForward }: SelectionBarProps) {
  const t = useT();
  const ids = useStore(selection.store, (s) => s.ids);
  return (
    <View testID="selection-bar" style={styles.bar}>
      <Text style={styles.info}>
        {t('messenger:selection.title', { n: ids.size })}
        {ids.size >= SELECTION_MAX && <Text style={styles.max}> {t('messenger:selection.limit', { n: SELECTION_MAX })}</Text>}
      </Text>
      <View style={styles.actions}>
        <IvuButton label={t('messenger:action.forward')} primary disabled={ids.size === 0} onPress={() => onForward([...ids].sort((a, b) => a - b), false)} />
        <IvuButton label={t('cancel')} onPress={selection.clear} />
      </View>
    </View>
  );
}

/** iView 小按钮（高 28、圆角 3、有描边）：主色或白底默认 */
function IvuButton({ label, primary = false, disabled = false, onPress }: { label: string; primary?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }) => styles.button(primary, disabled, pressed || hovered)}
    >
      <Text style={styles.buttonText(primary)}>{label}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => {
  const { webSelect } = theme.size;
  return {
    bar: {
      height: webSelect.bar,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: webSelect.barPadX,
      borderTopWidth: 1,
      borderTopColor: theme.colors.selectBarLine,
      backgroundColor: theme.colors.selectBar,
    },
    info: { ...theme.typography.selectInfo, color: theme.colors.pageText },
    // 旧版 iView 的错误红，与未读角标同色
    max: { ...theme.typography.selectMax, color: theme.colors.badge },
    actions: { flexDirection: 'row', gap: webSelect.buttonGap },
    button: (primary: boolean, disabled: boolean, active: boolean) => ({
      height: webSelect.button,
      paddingHorizontal: webSelect.buttonPadX,
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: theme.radius.tag,
      borderColor: primary ? theme.colors.ivuPrimary : active ? theme.colors.ivuPrimary : theme.colors.ivuBorder,
      backgroundColor: primary ? theme.colors.ivuPrimary : theme.colors.surface,
      opacity: disabled ? theme.opacity.disabled : primary && active ? theme.opacity.pressedPrimary : 1,
    }),
    buttonText: (primary: boolean) => ({ ...theme.typography.ivuButton, color: primary ? theme.colors.onPrimary : theme.colors.regularText }),
  };
});
