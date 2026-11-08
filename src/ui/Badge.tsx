import { memo } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** 未读角标：数字超过 999 显示 999+；muted 是免打扰会话的弱化样式。count 为 0 不显示 */
export const Badge = memo(function Badge({ count, muted = false }: { count: number; muted?: boolean }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge(muted)}>
      <Text style={styles.text} allowFontScaling={false} numberOfLines={1}>
        {count > 999 ? '999+' : String(count)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  badge: (muted: boolean) => ({
    minWidth: theme.size.badge,
    height: theme.size.badge,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: muted ? theme.colors.badgeMuted : theme.colors.badge,
  }),
  text: {
    ...theme.typography.caption2,
    color: theme.colors.onPrimary,
  },
}));
