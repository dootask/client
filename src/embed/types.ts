import type { StyleProp, ViewStyle } from 'react-native';

import type { EmbedSession } from './host';

export interface EmbedViewProps {
  /** 嵌入页网址 */
  url: string;
  /** 当前会话；主题、语言变化自动下发，token 只给与服务器同源的嵌入页 */
  session: EmbedSession;
  /** 嵌入页请求跳到站内路径 */
  onNavigate?: (path: string) => void;
  onTitle?: (title: string) => void;
  onClose?: () => void;
  /** 嵌入页改了数据，宿主据此刷新 */
  onChanged?: (scope: string, id?: string | number) => void;
  style?: StyleProp<ViewStyle>;
}
