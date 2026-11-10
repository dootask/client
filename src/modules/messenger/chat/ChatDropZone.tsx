import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { PickedFile } from '../../../platform/files';

/** App 上没有拖文件、粘贴文件进来的操作，只是容器。Web 版见 ChatDropZone.web.tsx */
export function ChatDropZone({ children }: { onFiles: (files: PickedFile[]) => void; disabled: boolean; children: ReactNode }) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
