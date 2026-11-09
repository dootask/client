/**
 * 待办提醒时间：预设（1 小时后、今晚 20:00、明早 9:00）、已有时间、自定义。时间都用毫秒；
 * 交给服务端时是服务器时区的 `YYYY-MM-DD HH:mm:ss`（按本机时区读写，同旧前端）
 */

export type Remind = 'none' | '1h' | 'tonight' | 'tomorrow' | 'current' | 'custom';

export const PRESETS = ['1h', 'tonight', 'tomorrow'] as const;

const HOUR = 3600_000;
/** 自定义时间的默认值离现在至少多久、取整到多少分钟 */
const CUSTOM_LEAD = HOUR / 2;
const CUSTOM_STEP = HOUR / 2;

/** 预设此刻对应的时间（同旧前端 remindAt）：今晚已过 20 点就算明晚 */
export function presetAt(remind: (typeof PRESETS)[number], now = Date.now()): number {
  if (remind === '1h') return now + HOUR;
  const d = new Date(now);
  if (remind === 'tomorrow') return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 9).getTime();
  const tonight = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 20).getTime();
  return tonight < now ? tonight + 24 * HOUR : tonight;
}

/** 默认的自定义时间：半小时后的下一个整点或半点 */
export const defaultCustom = (now = Date.now()) => new Date(Math.ceil((now + CUSTOM_LEAD) / CUSTOM_STEP) * CUSTOM_STEP);

/** 已有提醒时间作为自定义的初值；已过去时用默认值 */
export const customOf = (at: number, now = Date.now()) => (at > now ? new Date(at) : defaultCustom(now));

/** 已有提醒时间对应的选项：正好是「今晚」「明早」就选它，否则单列一项；没有或已过去的为 1 小时后 */
export function remindOf(at: number, now = Date.now()): Remind {
  if (at <= now) return '1h';
  return (['tonight', 'tomorrow'] as const).find((r) => presetAt(r, now) === at) ?? 'current';
}

/** 选项对应的时间；不提醒为 0 */
export function remindTime(remind: Remind, custom: Date, current: number, now = Date.now()): number {
  switch (remind) {
    case 'none':
      return 0;
    case 'current':
      return current;
    case 'custom':
      return custom.getTime();
    default:
      return presetAt(remind, now);
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 毫秒 → 服务端时间字符串；0 为 null（不提醒） */
export function serverTime(ms: number): string | null {
  if (!ms) return null;
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}
