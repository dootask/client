import { router } from 'expo-router';
import { useCallback } from 'react';
import { Linking } from 'react-native';

import { useT } from '../../../i18n';
import { fileApi } from '../../../sync/api';
import { showToast } from '../../../ui/Toast';
import { api, useErrorText } from '../../session';
import { openDialogRoute } from '../DialogList';
import { useMessenger } from '../hooks';
import { openSharedFile } from './fileActions';

/** 在线文档（文本、思维导图、流程图等）虽有存储文件，只能在文件模块里打开 */
const ONLINE_DOCS = ['folder', 'document', 'mind', 'drawio'];

/**
 * 点消息里的链接（同旧版 openDootaskLink）：网址交给系统 / 浏览器；dootask:// 的联系人、会话在本页打开，
 * 文件分享码指向的上传文件下载后打开；项目、任务去「项目」（M2、M3 之前是占位），其余要等对应模块的提示开发中
 */
export function useOpenHref() {
  const t = useT();
  const messenger = useMessenger();
  const errorText = useErrorText();
  return useCallback(
    (href: string) => {
      if (!href.startsWith('dootask://')) {
        void Linking.openURL(href).catch(() => {});
        return;
      }
      const failed = (err: unknown) => showToast(errorText(err));
      const [, type, id = '', id2] = href.match(/^dootask:\/\/(\w+)\/([^/]+)(?:\/(\d+))?$/) ?? [];
      const num = /^\d+$/.test(id) ? Number(id) : 0;
      switch (type) {
        case 'contact':
          if (num && messenger) messenger.openUser(num).then((dialogId) => openDialogRoute(dialogId)).catch(failed);
          return;
        case 'message':
          if (num) openDialogRoute(num, id2 ? Number(id2) : undefined);
          return;
        case 'project':
        case 'task':
          router.navigate('/projects');
          return;
        case 'file':
          if (!num) {
            fileApi
              .byCode(api, id)
              .then((file) => {
                if (file.content_url && !ONLINE_DOCS.includes(file.type)) openSharedFile({ ...file, content_url: file.content_url }, t);
                else showToast(t('wip'));
              })
              .catch(failed);
            return;
          }
      }
      showToast(t('wip'));
    },
    [t, messenger, errorText],
  );
}
