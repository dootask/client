import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export function PageTitle({ title }: { title: string }) {
  return <View style={styles.header}><Text style={styles.title} numberOfLines={1}>{title}</Text></View>;
}

const styles = StyleSheet.create((theme) => ({
  header: { height: theme.size.contentPages.titleHeight, paddingTop: theme.size.contentPages.titleTop, paddingLeft: theme.spacing.xxl, paddingRight: theme.size.sidePage.close + theme.size.sidePage.closeInset * 2 },
  title: { ...theme.typography.contentTitle, color: theme.colors.titleText },
}));
