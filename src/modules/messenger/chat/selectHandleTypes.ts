import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { SelectDrag } from './selectDrag';

/** 多选时每行左侧的勾选圈所在格：App 从这里上下拖动连续勾选，Web 只是普通的格子 */
export interface SelectHandleProps {
  msgId: number;
  drag: SelectDrag;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}
