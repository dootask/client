import { View, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** Web：静态 HTML 放进沙箱 iframe（不允许脚本） */
export function HtmlView({ html, style }: { html: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <iframe srcDoc={html} sandbox="" style={styles.frame} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, width: '100%', height: '100%', borderWidth: 0 },
});
