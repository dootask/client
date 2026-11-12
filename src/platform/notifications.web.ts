export const browserNotificationsSupported = () => typeof Notification !== 'undefined';

export async function notificationEnabled(): Promise<boolean> {
  return !browserNotificationsSupported() || Notification.permission === 'granted';
}

export async function openAppSettings(): Promise<void> {
  if (browserNotificationsSupported() && Notification.permission === 'default') await Notification.requestPermission();
}

let current: Notification | undefined;

export function showBrowserNotification(title: string, body: string, icon: string, onOpen: () => void): void {
  if (!browserNotificationsSupported() || Notification.permission !== 'granted') return;
  current?.close();
  const notification = new Notification(title, { body, icon, tag: 'dialog' });
  current = notification;
  notification.onclick = () => {
    notification.close();
    window.focus();
    onOpen();
  };
  notification.onclose = () => {
    if (current === notification) current = undefined;
  };
}

export function closeBrowserNotification(): void {
  current?.close();
  current = undefined;
}
