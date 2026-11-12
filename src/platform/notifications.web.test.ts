import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeBrowserNotification, notificationEnabled, openAppSettings, showBrowserNotification } from './notifications.web';

class BrowserNotification {
  static permission: NotificationPermission = 'granted';
  static requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
  static instances: BrowserNotification[] = [];
  onclick?: () => void;
  onclose?: () => void;
  close = vi.fn(() => this.onclose?.());
  constructor(readonly title: string, readonly options: NotificationOptions) {
    BrowserNotification.instances.push(this);
  }
}

beforeEach(() => {
  BrowserNotification.instances = [];
  BrowserNotification.permission = 'granted';
  BrowserNotification.requestPermission.mockClear();
  vi.stubGlobal('Notification', BrowserNotification);
  vi.stubGlobal('window', { focus: vi.fn() });
});

afterEach(() => {
  closeBrowserNotification();
  vi.unstubAllGlobals();
});

describe('网页通知 P6', () => {
  it('只有授权后才通知', async () => {
    BrowserNotification.permission = 'default';
    expect(await notificationEnabled()).toBe(false);
    showBrowserNotification('会话', '消息', 'avatar.png', vi.fn());
    expect(BrowserNotification.instances).toHaveLength(0);
    await openAppSettings();
    expect(BrowserNotification.requestPermission).toHaveBeenCalledOnce();
  });
  it('被拒绝后不重复请求授权', async () => {
    BrowserNotification.permission = 'denied';
    await openAppSettings();
    expect(BrowserNotification.requestPermission).not.toHaveBeenCalled();
    expect(await notificationEnabled()).toBe(false);
  });
  it('连续通知关闭上一条，并使用同一个 tag', () => {
    showBrowserNotification('一', '消息一', 'avatar.png', vi.fn());
    const first = BrowserNotification.instances[0];
    showBrowserNotification('二', '消息二', 'avatar.png', vi.fn());
    expect(first.close).toHaveBeenCalledOnce();
    expect(BrowserNotification.instances[1]).toMatchObject({ title: '二', options: { body: '消息二', icon: 'avatar.png', tag: 'dialog' } });
  });
  it('点击关闭通知、聚焦窗口并打开会话', () => {
    const open = vi.fn();
    showBrowserNotification('会话', '消息', 'avatar.png', open);
    const notification = BrowserNotification.instances[0];
    notification.onclick?.();
    expect(notification.close).toHaveBeenCalledOnce();
    expect(window.focus).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledOnce();
  });
  it('不支持浏览器通知时不显示权限条，也不创建通知', async () => {
    vi.stubGlobal('Notification', undefined);
    expect(await notificationEnabled()).toBe(true);
    await openAppSettings();
    expect(() => showBrowserNotification('会话', '消息', 'avatar.png', vi.fn())).not.toThrow();
  });
});
