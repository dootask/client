import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** 表单页的滚动容器：键盘弹起时底部让出键盘高度，内容可以滚上去。iOS 版见 KeyboardScroll.ios.tsx */
export function KeyboardScroll({ contentContainerStyle, children }: { contentContainerStyle?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create((_theme, rt) => ({
  scroll: {
    flex: 1,
    marginBottom: rt.insets.ime,
  },
}));
