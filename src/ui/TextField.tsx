import { type ReactNode, type Ref, useState } from 'react';
import { TextInput, type TextInputInstance, type TextInputProps, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  ref?: Ref<TextInputInstance>;
  /** 输入框里靠右的附加内容（如验证码图片） */
  right?: ReactNode;
};

/** 单行输入框：灰底圆角，聚焦时描边 */
export function TextField({ ref, right, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.box(focused)}>
      <TextInput
        {...rest}
        ref={ref}
        placeholderTextColor={theme.colors.text3}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={styles.input}
      />
      {right}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  box: (focused: boolean) => ({
    height: theme.size.control,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.block,
    borderWidth: 1,
    borderColor: focused ? theme.colors.focusRing : 'transparent',
    backgroundColor: theme.colors.fill,
    overflow: 'hidden',
  }),
  input: {
    // 不设行高：iOS 单行输入框设了行高，文字会偏离垂直居中，失焦后长文字还会折行
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.body.fontWeight,
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    // 聚焦的描边画在外框上，不再画浏览器自带的焦点框
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
}));
