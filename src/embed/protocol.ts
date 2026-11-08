/**
 * 嵌入协议 v1：宿主（本客户端）与嵌入页（微应用、文件预览、编辑器等独立网页）之间的 postMessage 消息。
 *
 * 宿主 → 嵌入页：init（服务器、token、语言、主题、用户）、theme、language
 * 嵌入页 → 宿主：ready（开始监听了，请下发 init）、navigate、title、close、changed
 *
 * 两个方向都用 JSON 字符串传信封 { source, v, type, payload }；嵌入页发来的消息不可信，用 zod 校验
 */
import { z } from 'zod';

export const EMBED_SOURCE = 'dootask-embed';
export const EMBED_PROTOCOL_VERSION = 1;

export type EmbedTheme = 'light' | 'dark';

export interface EmbedUser {
  userid: number;
  nickname: string;
  avatar: string;
}

export interface EmbedInit {
  server: string;
  /** 只下发给与服务器同源的嵌入页，其他来源没有这一项 */
  token?: string;
  theme: EmbedTheme;
  language: string;
  user: EmbedUser;
}

export type HostMessage =
  | { type: 'init'; payload: EmbedInit }
  | { type: 'theme'; payload: { theme: EmbedTheme } }
  | { type: 'language'; payload: { language: string } };

const guestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  // 只接受站内路径，嵌入页不能把宿主带到任意网址
  z.object({ type: z.literal('navigate'), payload: z.object({ path: z.string().regex(/^\/(?!\/)/) }) }),
  z.object({ type: z.literal('title'), payload: z.object({ title: z.string().max(200) }) }),
  z.object({ type: z.literal('close') }),
  z.object({ type: z.literal('changed'), payload: z.object({ scope: z.string(), id: z.union([z.string(), z.number()]).optional() }) }),
]);

export type GuestMessage = z.infer<typeof guestSchema>;

export function encodeHostMessage(message: HostMessage): string {
  return JSON.stringify({ source: EMBED_SOURCE, v: EMBED_PROTOCOL_VERSION, ...message });
}

/** 嵌入页发消息用的编码（测试和嵌入页 SDK 用） */
export function encodeGuestMessage(message: GuestMessage): string {
  return JSON.stringify({ source: EMBED_SOURCE, v: EMBED_PROTOCOL_VERSION, ...message });
}

/** 解析嵌入页发来的消息；不是本协议的（页面里别的 postMessage）或格式不对的返回 null */
export function parseGuestMessage(raw: unknown): GuestMessage | null {
  if (typeof raw !== 'string' || !raw.startsWith('{')) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { source, v } = data as { source?: unknown; v?: unknown };
  if (source !== EMBED_SOURCE || v !== EMBED_PROTOCOL_VERSION) return null;
  const parsed = guestSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** 取网址的来源（协议 + 主机 + 端口），小写；不是 http(s) 网址返回 null */
export function originOf(url: string): string | null {
  const match = /^(https?):\/\/([^/?#@]+)(?=[/?#]|$)/i.exec(url);
  if (!match) return null;
  const scheme = match[1].toLowerCase();
  const host = match[2].toLowerCase().replace(scheme === 'https' ? /:443$/ : /:80$/, '');
  return `${scheme}://${host}`;
}
