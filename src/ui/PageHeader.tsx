import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** 导航栏：高 52 + 顶部安全区，标题居中，左右各一个操作区（docs/ui-spec.md 第 3 节） */
export function PageHeader({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <View style={styles.side}>{left}</View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    paddingTop: rt.insets.top,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  bar: {
    height: theme.size.navBar,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  title: {
    ...theme.typography.title2,
    color: theme.colors.text,
    flexShrink: 1,
    textAlign: 'center',
  },
}));
