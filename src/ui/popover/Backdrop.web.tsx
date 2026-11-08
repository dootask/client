import { StyleSheet } from 'react-native-unistyles';

/** 弹出层外面的透明区域：左键、右键都只是关闭，右键不弹浏览器菜单 */
export function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={StyleSheet.absoluteFillObject}
      onClick={onClose}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
    />
  );
}
