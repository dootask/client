import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** 还没重写的页面显示的占位：标题和说明由调用方翻译好传进来 */
export function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.page,
    backgroundColor: theme.colors.bg,
  },
  title: {
    ...theme.typography.title1,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.subhead,
    color: theme.colors.text3,
  },
}));
