import { Search, X } from 'lucide-react-native';
import { type Ref } from 'react';
import { TextInput, type TextInputInstance, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon } from './Icon';
import { Touchable } from './Touchable';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** 清除按钮的无障碍说明 */
  clearLabel: string;
  ref?: Ref<TextInputInstance>;
}

/** 列表顶部的搜索框：灰底胶囊，左边放大镜，有字时右边清除 */
export function SearchField({ value, onChangeText, placeholder, clearLabel, ref }: SearchFieldProps) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.box}>
      <Icon icon={Search} color={theme.colors.text3} size={theme.size.iconSmall} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text3}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={styles.input}
      />
      {value !== '' && (
        <Touchable accessibilityRole="button" accessibilityLabel={clearLabel} onPress={() => onChangeText('')} hitSlop={theme.spacing.sm} style={({ pressed }) => styles.clear(pressed)}>
          <Icon icon={X} color={theme.colors.text3} size={theme.size.iconSmall} />
        </Touchable>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  box: {
    height: theme.size.searchField,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.block,
    backgroundColor: theme.colors.fill,
  },
  input: {
    // 不设行高：iOS 单行输入框设了行高，文字会偏离垂直居中
    fontSize: theme.typography.subhead.fontSize,
    flex: 1,
    alignSelf: 'stretch',
    padding: 0,
    color: theme.colors.text,
    // 不画浏览器自带的焦点框（外框已经是灰底块）
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
  clear: (pressed: boolean) => ({
    opacity: pressed ? theme.opacity.pressedIcon : 1,
  }),
}));
