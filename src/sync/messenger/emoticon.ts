import { EMOJI_GROUPS, EMOTICON_PACKS } from './emojiData';

/**
 * 表情面板的数据：emoji 和表情包打包在应用里（由主仓库同一份数据生成，见 scripts/gen-emoji.mjs），
 * 表情包图片和在线贴纸从服务器取。发出的表情包与旧网页一致：一个 class="emoticon" 的 <img>
 */

export type EmojiCategory = (typeof EMOJI_GROUPS)[number]['type'];

export interface EmojiGroup {
  type: EmojiCategory;
  emojis: readonly string[];
}

/** 表情包或在线贴纸：发送时只用 asset、name、src */
export interface Emoticon {
  name: string;
  /** 表情包是图片在服务器上的路径，在线贴纸固定为 emosearch */
  asset: string;
  src: string;
  /** 快捷表情匹配的关键词（在线贴纸没有） */
  keys?: readonly string[];
}

export interface EmoticonPack {
  name: string;
  icon: string;
  items: readonly Emoticon[];
}

export const STICKER_ASSET = 'emosearch';

let groups: EmojiGroup[] | null = null;

/** emoji 按分类，第一次用到时才拆开 */
export function emojiGroups(): readonly EmojiGroup[] {
  groups ??= EMOJI_GROUPS.map(({ type, emojis }) => ({ type, emojis: emojis.split(' ') }));
  return groups;
}

const packsByOrigin = new Map<string, EmoticonPack[]>();

/** 表情包（图片地址按服务器根地址拼，origin 带结尾的 /） */
export function emoticonPacks(origin: string): readonly EmoticonPack[] {
  let packs = packsByOrigin.get(origin);
  if (!packs) {
    packs = EMOTICON_PACKS.map(({ name, path, icon, items }) => ({
      name,
      icon: `${origin}images/emoticon/${path}/${icon}`,
      items: items.map(([itemName, file, keys]) => ({
        name: itemName,
        asset: `images/emoticon/${path}/${file}`,
        src: `${origin}images/emoticon/${path}/${file}`,
        keys: keys ? keys.split(' ') : [],
      })),
    }));
    packsByOrigin.set(origin, packs);
  }
  return packs;
}

const QUICK_TEXT_MAX = 8;
const QUICK_PER_PACK = 2;
const QUICK_MAX = 20;

/** 可能触发快捷表情的输入：不含空白、不超过 8 个字的文字；不是就返回空串 */
export function quickKeyword(text: string): string {
  return text.length > 0 && text.length <= QUICK_TEXT_MAX && !/\s/.test(text) ? text : '';
}

/** 快捷表情：名称或关键词恰好等于输入的表情包，每套最多两个，总共最多 20 个（同旧网页） */
export function matchEmoticons(packs: readonly EmoticonPack[], keyword: string): Emoticon[] {
  const result: Emoticon[] = [];
  if (!keyword) return result;
  for (const pack of packs) {
    if (result.length >= QUICK_MAX) break;
    result.push(...pack.items.filter((item) => item.name === keyword || item.keys?.includes(keyword)).slice(0, QUICK_PER_PACK));
  }
  return result;
}

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 发出的消息内容 */
export function emoticonHtml({ asset, name, src }: Emoticon): string {
  return `<img class="emoticon" data-asset="${escapeAttr(asset)}" data-name="${escapeAttr(name)}" src="${escapeAttr(src)}"/>`;
}
