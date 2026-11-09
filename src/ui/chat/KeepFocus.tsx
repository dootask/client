import { View, type ViewProps } from 'react-native';

/** 点里面的东西不抢输入框的焦点（Web 用）；原生点按本来就不收键盘（keyboardShouldPersistTaps），是普通 View */
export function KeepFocus(props: ViewProps) {
  return <View {...props} />;
}
