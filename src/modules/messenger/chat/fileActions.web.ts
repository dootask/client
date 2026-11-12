import { Download } from 'lucide-react-native';

import type { Translate } from '../../../i18n';
import { dialogApi } from '../../../sync/api';
import type { SharedFile } from '../../../sync/api/file';
import type { Msg } from '../../../sync/api/dialog';
import type { MsgBody } from '../../../sync/messenger/body';
import { showLayerConfirm } from '../../../ui/LayerConfirm';
import type { MenuAction } from '../../../ui/popover';
import { api } from '../../session';
import { formatBytes } from './bytes';
import type { MenuKey } from './messageMenu';

type FileBody = Extract<MsgBody, { kind: 'file' }>;

/** 网页没有应用内下载进度（交给浏览器） */
export function useFileProgress(_msgId: number): number | null {
  return null;
}

/** 网页的文件消息（同旧版网页）：先确认「文件名 (大小)」，再交给浏览器下载 */
export function openMsgFile(msg: Msg, body: FileBody, t: Translate) {
  showLayerConfirm({
    title: t('messenger:file.downloadTitle'),
    message: `${body.name} (${formatBytes(body.size)})`,
    okLabel: t('messenger:file.downloadNow'),
    cancelLabel: t('messenger:chat.cancel'),
    onOk: () => void window.open(dialogApi.msgFileUrl(api, msg.id)),
  });
}

/** 消息里文件分享码指向的上传文件：交给浏览器 */
export function openSharedFile(file: SharedFile & { content_url: string }, _t: Translate) {
  window.open(file.content_url);
}

/** 右键菜单里的下载：文件同点卡片（先确认），图片直接打开原图（同旧版「下载图片」） */
export function fileMenu(msg: Msg, body: MsgBody, t: Translate): Partial<Record<MenuKey, MenuAction>> {
  if (body.kind === 'image') {
    return { downloadImage: { label: t('messenger:file.downloadImage'), icon: Download, onSelect: () => void window.open(body.url) } };
  }
  if (body.kind === 'file') {
    return { download: { label: t('messenger:file.download'), icon: Download, onSelect: () => openMsgFile(msg, body, t) } };
  }
  return {};
}
