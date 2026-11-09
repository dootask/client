import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { haptics } from '../platform/haptics';
import { Touchable } from './Touchable';

/** 分段控件：fill 底，选中块 segmentActive；切换时轻震 */
export function Segmented<K extends string>({ items, value, onChange }: {
  items: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Touchable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              haptics.selection();
              onChange(item.key);
            }}
            style={styles.segment(active)}
          >
            <Text style={styles.label(active)} numberOfLines={1}>
              {item.label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  track: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: theme.radius.block,
    backgroundColor: theme.colors.fill,
  },
  segment: (active: boolean) => ({
    flex: 1,
    height: theme.size.segment - 4,
    borderRadius: theme.radius.block - 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: active ? theme.colors.segmentActive : 'transparent',
    boxShadow: active ? theme.shadow.float : undefined,
  }),
  label: (active: boolean) => ({ ...theme.typography.footnote, fontWeight: active ? '600' : '400', color: active ? theme.colors.text : theme.colors.text2 }),
}));
