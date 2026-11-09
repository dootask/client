import { BlurView } from 'expo-blur';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

/** 长按菜单背后的模糊层：模糊下层内容，上面再叠一层遮罩 */
export function MenuBackdrop() {
  const { rt } = useUnistyles();
  return <BlurView pointerEvents="none" style={StyleSheet.absoluteFill} intensity={BLUR_INTENSITY} tint={rt.themeName === 'dark' ? 'dark' : 'light'} />;
}

const BLUR_INTENSITY = 30;
