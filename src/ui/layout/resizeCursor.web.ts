import type { ViewStyle } from 'react-native';

/** RN 的 CursorValue 只声明了 auto / pointer，react-native-web 实际透传任意 CSS 光标 */
export const resizeCursor = { cursor: 'col-resize' } as unknown as ViewStyle;
