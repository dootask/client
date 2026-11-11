import { memo } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/**
 * 未读角标，同旧版 iView 角标：红底白字、外圈 1 像素白边，超过 999 显示 999+；
 * muted 是免打扰会话的灰底样式。count 为 0 不显示。旧版各处缩小显示的，由外层按 scale 缩
 */
export const Badge = memo(function Badge({ count, muted = false, scale, origin = 'center' }: { count: number; muted?: boolean; scale?: number; origin?: 'left' | 'center' | 'right' }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge(muted, scale, origin)}>
      <Text style={styles.text(muted)} allowFontScaling={false} numberOfLines={1}>
        {count > 999 ? '999+' : String(count)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  badge: (muted: boolean, scale: number | undefined, origin: string) => ({
    minWidth: theme.size.badge,
    height: theme.size.badge,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.size.badgePadding,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: muted ? theme.colors.badgeMuted : theme.colors.badge,
    boxShadow: `0px 0px 0px 1px ${theme.colors.surface}`,
    transform: scale ? [{ scale }] : undefined,
    transformOrigin: `${origin} center`,
  }),
  text: (muted: boolean) => ({
    ...theme.typography.caption,
    color: muted ? theme.colors.badgeMutedText : theme.colors.onPrimary,
  }),
}));
