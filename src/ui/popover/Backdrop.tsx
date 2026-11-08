import { Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** 弹出层外面的透明区域，点一下关闭 */
export function Backdrop({ onClose }: { onClose: () => void }) {
  return <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />;
}
