import { Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** 表单下方的错误提示；没有错误时不占位 */
export function FormError({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <Text style={styles.error} accessibilityRole="alert">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create((theme) => ({
  error: {
    ...theme.typography.footnote,
    color: theme.colors.danger,
  },
}));
