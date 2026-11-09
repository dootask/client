import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../i18n';
// 只有 Web 有：直接引用 Web 实现
import { fromBrowserFiles, type PickedFile } from '../../../platform/files.web';
import { DropZone } from '../../../ui/DropZone';

/**
 * 聊天区（Web）：文件拖进来松手、往页面里粘贴文件（截图、复制的文件）都交给 onFiles。
 * 粘贴只认带文件的，纯文字照常粘进输入框
 */
export function ChatDropZone({ onFiles, children }: { onFiles: (files: PickedFile[]) => void; children: ReactNode }) {
  const t = useT();
  const take = (files: File[]) => void fromBrowserFiles(files).then(onFiles);
  const onPasteFiles = useEffectEvent(take);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) return;
      event.preventDefault();
      onPasteFiles(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  return (
    <DropZone label={t('messenger:chat.dropHint')} onFiles={take} style={styles.root}>
      {children}
    </DropZone>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
