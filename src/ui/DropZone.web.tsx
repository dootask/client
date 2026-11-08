import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { type HostInstance, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { DropZoneProps } from './dropZoneTypes';

export type { DropZoneProps } from './dropZoneTypes';

/** 只认从系统拖进来的文件，页面里拖文字、拖图片不算 */
const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;

/** 拆出文件，文件夹单独报告（浏览器给文件夹的 File 读不出内容） */
function readDrop(data: DataTransfer): { files: File[]; folders: boolean } {
  const files: File[] = [];
  let folders = false;
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file') continue;
    if (item.webkitGetAsEntry()?.isDirectory) {
      folders = true;
      continue;
    }
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return { files, folders };
}

/** 拖文件上传的区域：拖着文件进来时盖一层高亮蒙层，松手交出文件 */
export function DropZone({ onFiles, onFolders, label, disabled = false, style, children }: DropZoneProps) {
  const ref = useRef<HostInstance>(null);
  const [over, setOver] = useState(false);

  const drop = useEffectEvent((data: DataTransfer) => {
    const { files, folders } = readDrop(data);
    if (folders) onFolders?.();
    if (files.length > 0) onFiles(files);
  });

  useEffect(() => {
    if (disabled) return;
    const node = ref.current as unknown as HTMLElement;
    // 进出子元素也会触发 enter / leave，计数归零才算真的离开
    let depth = 0;
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setOver(true);
    };
    const move = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      // 不拦就不会触发 drop
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      depth = 0;
      setOver(false);
      drop(event.dataTransfer);
    };
    node.addEventListener('dragenter', enter);
    node.addEventListener('dragover', move);
    node.addEventListener('dragleave', leave);
    node.addEventListener('drop', onDrop);
    return () => {
      node.removeEventListener('dragenter', enter);
      node.removeEventListener('dragover', move);
      node.removeEventListener('dragleave', leave);
      node.removeEventListener('drop', onDrop);
      setOver(false);
    };
  }, [disabled]);

  return (
    <View ref={ref} style={style}>
      {children}
      {over && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing.sm,
    borderRadius: theme.radius.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  label: {
    ...theme.typography.title2,
    color: theme.colors.primaryText,
  },
}));
