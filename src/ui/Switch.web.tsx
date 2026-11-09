import type { ComponentType } from 'react';
import { Switch as BaseSwitch, type SwitchProps } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

/** react-native-web 的开关多一个 activeThumbColor（RN 类型里没有），不给时打开后滑块是默认的青绿色 */
const WebSwitch = BaseSwitch as ComponentType<SwitchProps & { activeThumbColor?: string }>;

/** 开关（Web）：打开时滑块和关闭时一样是白色 */
export function Switch(props: SwitchProps) {
  const { theme } = useUnistyles();
  return <WebSwitch activeThumbColor={theme.colors.onPrimary} {...props} />;
}
