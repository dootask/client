import { router } from 'expo-router';

export function closeContentPage(dialogId: number) {
  if (router.canGoBack()) router.back();
  else router.navigate(`/messenger/${dialogId}`);
}

export function locateInChat(dialogId: number, msgId: number, reply = false) {
  router.dismissTo({ pathname: '/messenger/[dialogId]', params: { dialogId: String(dialogId), msg: String(msgId), at: String(Date.now()), reply: reply ? '1' : undefined } });
}
