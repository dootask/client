import type { DateFormats, Translate } from '../../../i18n';
import { toUnix } from '../../../sync/messenger';

/**
 * 聊天页的文字格式：日期分隔、在线状态、语音时长、文件大小
 */

const DAY = 86_400_000;

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** 日期分隔：今天、昨天、今年月日、跨年年月日 */
export function dayLabel(ts: number, today: number, t: Translate, f: DateFormats): string {
  const day = startOfDay(ts);
  if (day === today) return t('messenger:chat.today');
  if (day === today - DAY) return t('messenger:yesterday');
  const date = new Date(ts);
  return date.getFullYear() === new Date(today).getFullYear() ? f.monthDay(date) : f.full(date);
}

/** 单聊副标题：在线，或最后在线时间（同旧前端 sharedWebViewDialogBars.lastSeen） */
export function onlineText(online: boolean, lineAt: string | null | undefined, now: number, t: Translate, f: DateFormats): string {
  if (online) return t('messenger:chat.online');
  const at = toUnix(lineAt) * 1000;
  if (!at) return '';
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 60) return t('messenger:chat.lastOnline', { time: t('messenger:chat.justNow') });
  if (seconds < 3600) return t('messenger:chat.lastOnlineMinutes', { n: Math.floor(seconds / 60) });
  if (seconds < 6 * 3600) return t('messenger:chat.lastOnlineHours', { n: Math.floor(seconds / 3600) });
  const date = new Date(at);
  const today = startOfDay(now);
  const day = startOfDay(at);
  if (day === today) return t('messenger:chat.lastOnlineToday', { time: f.time(date) });
  if (day === today - DAY) return t('messenger:chat.lastOnlineYesterday', { time: f.time(date) });
  return t('messenger:chat.lastOnline', { time: seconds < 365 * DAY / 1000 ? f.full(date) : t('messenger:chat.longAgo') });
}

/** 语音时长：一分钟内 12″，以上 1:05 */
export function formatSeconds(seconds: number): string {
  return seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : `${seconds}″`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** 角标数字，超过 99 显示 99+ */
export const countText = (n: number) => (n > 99 ? '99+' : String(n));

/** 某个时刻（毫秒）：今年为「月日 时:分」，跨年加年份 */
export function formatMoment(ms: number, f: DateFormats): string {
  const date = new Date(ms);
  const day = date.getFullYear() === new Date().getFullYear() ? f.monthDay(date) : f.full(date);
  return `${day} ${f.time(date)}`;
}
