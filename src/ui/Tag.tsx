import { type StyleProp, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** 旧版网页的 iView 标签（会话行、聊天页标题旁）：灰色默认款、红色危险款；外边距由调用处给，textStyle 改文字色（聊天页标题旁） */
export function Tag({ text, danger = false, style, textStyle }: { text: string; danger?: boolean; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={[styles.tag(danger), style]}>
      <Text style={[styles.text(danger), textStyle]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  tag: (danger: boolean) => ({
    height: theme.size.tag,
    flexShrink: 0,
    justifyContent: 'center',
    paddingHorizontal: theme.size.tagPadding,
    borderRadius: theme.radius.tag,
    borderWidth: 1,
    borderColor: danger ? theme.colors.tagRedLine : theme.colors.menuDivider,
    backgroundColor: danger ? theme.colors.tagRedFill : theme.colors.searchFill,
  }),
  text: (danger: boolean) => ({
    ...theme.typography.caption,
    color: danger ? theme.colors.tagRedText : theme.colors.tagText,
  }),
}));
