import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/**
 * iOS：交给系统按键盘调整滚动区的内边距并把输入框滚到可见处，不改布局。
 * 按键盘高度缩小滚动区的话，切换输入框时键盘高度一变（如密码框没有联想栏），居中的内容就会跳
 */
export function KeyboardScroll({ contentContainerStyle, children }: { contentContainerStyle?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
});
