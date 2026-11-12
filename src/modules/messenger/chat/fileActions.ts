import { ImageDown, Share2 } from 'lucide-react-native';

import type { Translate } from '../../../i18n';
import { AlbumDenied, cancelDownload, isAbort, openWithSystem, saveToAlbum, shareFile, useDownloadProgress } from '../../../platform/download';
import { dialogApi } from '../../../sync/api';
import type { SharedFile } from '../../../sync/api/file';
import type { Msg } from '../../../sync/api/dialog';
import type { MsgBody } from '../../../sync/messenger/body';
import type { MenuAction } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { api } from '../../session';
import type { MenuKey } from './messageMenu';

type FileBody = Extract<MsgBody, { kind: 'file' }>;

/** 这条消息的文件下载进度（0–1），没在下载时为 null */
export const useFileProgress = (msgId: number): number | null => useDownloadProgress(msgId);

/**
 * App 上的文件消息（同旧版 App）：点了下到缓存后用系统打开，进度显示在气泡上，下载中再点是取消；
 * 缓存和进度按消息 ID，会话页、合并转发里的同一条共用
 */
export function openMsgFile(msg: Msg, body: FileBody, t: Translate) {
  if (cancelDownload(msg.id)) return;
  openWithSystem(msg.id, dialogApi.msgFileUrl(api, msg.id), body.name, body.size).catch((err: unknown) => {
    if (!isAbort(err)) showToast(t('messenger:file.openFailed'));
  });
}

/** 消息里文件分享码指向的上传文件（同旧版 App）：没有地方显示进度，先提示下载中，下完用系统打开 */
export function openSharedFile(file: SharedFile & { content_url: string }, t: Translate) {
  showToast(t('messenger:file.downloading'));
  const name = file.ext ? `${file.name}.${file.ext}` : file.name;
  openWithSystem(`file-${file.id}`, file.content_url, name, file.size ?? 0).catch((err: unknown) => {
    if (!isAbort(err)) showToast(t('messenger:file.openFailed'));
  });
}

/** 消息菜单里的文件操作：图片、视频存相册和分享，文件分享（进度显示在气泡上） */
export function fileMenu(msg: Msg, body: MsgBody, t: Translate): Partial<Record<MenuKey, MenuAction>> {
  const failed = (err: unknown) => {
    if (!isAbort(err)) showToast(t('messenger:chat.operationFailed'));
  };
  if (body.kind === 'image' || body.kind === 'video') {
    return {
      save: {
        label: t('media.save'),
        icon: ImageDown,
        onSelect: () =>
          void saveToAlbum(msg.id, body.url)
            .then(() => showToast(t('media.saved')))
            .catch((err: unknown) => showToast(t(err instanceof AlbumDenied ? 'media.noAlbum' : 'media.saveFailed'))),
      },
      share: { label: t('media.share'), icon: Share2, onSelect: () => void shareFile(msg.id, body.url).catch(failed) },
    };
  }
  if (body.kind === 'file') {
    return {
      share: { label: t('media.share'), icon: Share2, onSelect: () => void shareFile(msg.id, dialogApi.msgFileUrl(api, msg.id), body.name, body.size).catch(failed) },
    };
  }
  return {};
}
