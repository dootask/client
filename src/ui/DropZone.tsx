import { View } from 'react-native';

import type { DropZoneProps } from './dropZoneTypes';

export type { DropZoneProps } from './dropZoneTypes';

/** App 上没有拖文件进来的操作，只是普通容器。Web 版见 DropZone.web.tsx */
export function DropZone({ style, children }: DropZoneProps) {
  return <View style={style}>{children}</View>;
}
