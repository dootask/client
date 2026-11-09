import { useState } from 'react';

import { useT } from '../../../i18n';
import { CameraDenied, capture, pickDocuments, pickMedia, type PickedFile } from '../../../platform/files';
import { compressPhoto } from '../../../platform/photos';
import { FILE_MAX_SIZE } from '../../../sync/api';
import { composeToHtml } from '../../../sync/messenger';
import { showToast } from '../../../ui/Toast';
import { useMessenger } from '../hooks';
import type { ComposerMode } from './Composer';
import { formatBytes } from './format';

/**
 * 发文件：相册、拍摄、文件三个来源，Web 上还有拖进来、粘贴进来的。
 * 只有图片和视频的先进预览（可删、可选原图、可加说明），其他直接发
 */

export type PickSource = 'media' | 'capture' | 'file';

const PICKERS: Record<PickSource, () => Promise<PickedFile[]>> = { media: pickMedia, capture, file: pickDocuments };

export interface SendOptions {
  /** 发之前压缩图片（没勾原图） */
  compress?: boolean;
  /** 跟在文件后面发的说明（纯文字） */
  caption?: string;
}

export interface Attach {
  /** 待预览的文件和原图开关的初始值，null 时不显示预览 */
  preview: { files: PickedFile[]; original: boolean } | null;
  closePreview: () => void;
  pick: (source: PickSource) => void;
  /** 选好的文件：只有图片、视频的进预览，否则直接发 */
  offer: (files: PickedFile[], original?: boolean) => void;
  send: (files: PickedFile[], options?: SendOptions) => void;
}

export function useAttach({ dialogId, mode, onModeEnd, onSent }: {
  dialogId: number;
  mode: ComposerMode;
  onModeEnd: () => void;
  onSent: () => void;
}): Attach {
  const t = useT();
  const messenger = useMessenger();
  const [preview, setPreview] = useState<Attach['preview']>(null);

  const send = async (files: PickedFile[], { compress = false, caption = '' }: SendOptions = {}) => {
    if (!messenger) return;
    const big = files.find((file) => file.size > FILE_MAX_SIZE);
    if (big) showToast(t('messenger:chat.fileTooLarge', { name: big.name, size: formatBytes(FILE_MAX_SIZE) }));
    const accepted = files.filter((file) => file.size <= FILE_MAX_SIZE);
    if (accepted.length === 0) return;
    // 正在回复时文件带上回复；编辑消息不受影响
    const replyId = mode?.kind === 'reply' ? mode.msg.id : undefined;
    if (replyId) onModeEnd();
    const ready = compress ? await Promise.all(accepted.map(compressPhoto)) : accepted;
    messenger.sendFiles({ dialog_id: dialogId, files: ready, reply_id: replyId, caption: caption.trim() ? composeToHtml({ text: caption.trim(), mentions: [] }) : undefined });
    onSent();
  };

  const offer = (files: PickedFile[], original = false) => {
    if (files.length === 0) return;
    if (files.every((file) => file.media)) setPreview({ files, original });
    else void send(files);
  };

  const pick = (source: PickSource) => {
    PICKERS[source]()
      .then((files) => (source === 'file' ? void send(files) : offer(files)))
      .catch((err: unknown) => {
        showToast(err instanceof CameraDenied ? t('messenger:chat.cameraDenied') : t('messenger:chat.operationFailed'));
      });
  };

  return { preview, closePreview: () => setPreview(null), pick, offer, send: (files, options) => void send(files, options) };
}
