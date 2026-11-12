import { useEffect, useEffectEvent } from 'react';

import { useT } from '../../i18n';
import type { Msg } from '../../sync/api/dialog';
import { usersApi } from '../../sync/api';
import { messageNotification, shouldNotify } from '../../sync/messenger';
import type { CachedUser } from '../../sync/users/directory';
import { api, useSession } from '../session';
import { useMessenger } from './hooks';
import { previewText } from './PreviewText';
import { useMessengerInstance } from './service';

/** 一条该提醒的新消息：标题是会话名，正文是摘要（群聊带发送人） */
export interface IncomingNotice {
  msg: Msg;
  sender: CachedUser | undefined;
  title: string;
  body: string;
}

/**
 * 新消息提醒的公共部分（同旧版 manage.vue addDialogMsg）：按 shouldNotify 过滤，补齐会话和发送人资料，
 * 只提醒最新的一条（补资料期间又来了新的，旧的作废）。两端各自决定怎么显示
 */
export function useIncomingNotices({ foreground, allowed, onNotice }: {
  /** 窗口 / App 是否在前台（前台时正看着的会话不提醒） */
  foreground: () => boolean;
  /** 这一端是否提醒这条消息（如网页要有通知权限） */
  allowed: (msg: Msg) => boolean | Promise<boolean>;
  onNotice: (notice: IncomingNotice) => void;
}) {
  const t = useT();
  const messenger = useMessenger();
  const users = useMessengerInstance((s) => s.users);
  const userId = useSession((s) => s.user?.userid ?? 0);
  const describe = useEffectEvent((input: Omit<Parameters<typeof messageNotification>[0], 'aiName' | 'formatPreview'>) => messageNotification({
    ...input, aiName: t('messenger:notify.ai'), formatPreview: (preview) => previewText(preview, t),
  }));
  const isForeground = useEffectEvent(foreground);
  const isAllowed = useEffectEvent(allowed);
  const notify = useEffectEvent(onNotice);

  useEffect(() => {
    if (!messenger || !users || !userId) return;
    let latest = 0;
    let alive = true;
    const unsubscribe = messenger.onIncoming(({ msg, silence }) => {
      const context = () => ({ msg, silence, userId, foreground: isForeground(), viewingId: messenger.store.getState().openId });
      if (!shouldNotify(context())) return;
      const sequence = ++latest;
      void (async () => {
        if (!(await isAllowed(msg))) return;
        if (!messenger.store.getState().dialogs[msg.dialog_id]) await messenger.fetchDialog(msg.dialog_id);
        let sender = users.store.getState().users[msg.userid];
        if (!sender && msg.userid > 0) {
          const list = await usersApi.basic(api, [msg.userid]);
          if (!alive) return;
          users.put(list);
          sender = users.store.getState().users[msg.userid];
        }
        if (!alive || sequence !== latest) return;
        const dialog = messenger.store.getState().dialogs[msg.dialog_id];
        if (!dialog) return;
        const notice = describe({ ...context(), dialog, senderName: sender?.nickname ?? '' });
        if (notice) notify({ msg, sender, ...notice });
      })().catch((error) => console.warn('[notification]', error));
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [messenger, users, userId]);
}
