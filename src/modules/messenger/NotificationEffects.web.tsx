import { useEffect } from 'react';

import { closeBrowserNotification, notificationEnabled, showBrowserNotification } from '../../platform/notifications.web';
import { unreadTotals } from '../../sync/messenger';
import { useSession } from '../session';
import { openDialogRoute } from './DialogList';
import { useMessenger } from './hooks';
import { useIncomingNotices } from './useIncomingNotices';

/** 网页：标签页标题带未读数，新消息弹浏览器通知（点击回到页面并打开会话） */
export function NotificationEffects() {
  const messenger = useMessenger();
  const server = useSession((s) => s.server);

  useEffect(() => {
    const title = document.title;
    const update = () => {
      const total = messenger ? unreadTotals(Object.values(messenger.store.getState().dialogs)).badge : 0;
      document.title = total > 0 ? `(${total}) ${title}` : title;
    };
    update();
    const unsubscribe = messenger?.store.subscribe((state, previous) => {
      if (state.dialogs !== previous.dialogs) update();
    });
    return () => {
      unsubscribe?.();
      document.title = title;
    };
  }, [messenger]);

  useEffect(() => closeBrowserNotification, [messenger]);

  useIncomingNotices({
    foreground: () => !document.hidden,
    allowed: notificationEnabled,
    onNotice: ({ msg, sender, title, body }) => {
      const icon = msg.userid === -1 ? `${server}/images/avatar/default_assistant.png` : sender?.userimg || `${server}/images/logo.png`;
      showBrowserNotification(title, body, icon, () => openDialogRoute(msg.dialog_id));
    },
  });

  return null;
}
