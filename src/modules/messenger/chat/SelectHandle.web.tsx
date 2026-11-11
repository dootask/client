import { View } from 'react-native';

import type { SelectHandleProps } from './selectHandleTypes';

/** Web 用 Shift 点选连续勾选，不接拖动 */
export function SelectHandle({ style, children }: SelectHandleProps) {
  return <View style={style}>{children}</View>;
}
