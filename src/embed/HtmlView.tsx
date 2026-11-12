import type { StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

/** App：显示一段静态 HTML（纯展示，不开 JS、不跳转） */
export function HtmlView({ html, style }: { html: string; style?: StyleProp<ViewStyle> }) {
  return <WebView source={{ html }} originWhitelist={['about:*']} javaScriptEnabled={false} style={style} />;
}
