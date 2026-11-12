import { Car, Flag, Lightbulb, type LucideIcon, PawPrint, Shapes, Smile, Trophy, UtensilsCrossed } from 'lucide-react-native';

import type { EmojiCategory } from '../../../sync/messenger';
import { kv, KV_KEYS } from '../../../sync/storage';

/** 表情面板的分类图标（App、Web 共用） */
export const CATEGORY_ICONS: Record<EmojiCategory, LucideIcon> = {
  p: Smile, n: PawPrint, d: UtensilsCrossed, s: Shapes, a: Trophy, t: Car, o: Lightbulb, f: Flag,
};

/** 输入栏表情面板里的表情 */
export const EMOJIS = Array.from(
  '😀😁😂🤣😊😍😘😎🤔😴😭😡😅🙂😉😇🥳😱😳🤗🤝👍👎👏🙏💪👌✌️🎉❤️💔🔥✅❌⭐🌹☕🍺🎂🚀💯'.match(/\p{Extended_Pictographic}️?/gu) ?? [],
);

/** 消息菜单表情条的默认表情，前面再放最近用过的 3 个（同旧 App quickEmojis、旧网页 operateEmojis） */
export const QUICK_REACTIONS = ['👌', '👍', '😂', '🎉', '❤️', '🥳️', '🥰', '😥', '😭'];

/** 双击气泡点的赞 */
export const LIKE = '👍';

function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(kv.getString(KV_KEYS.recentEmojis) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/** 消息菜单的表情条：最近用过的 3 个 + 默认表情（去重） */
export function quickReactions(): string[] {
  const list = readRecent().slice(0, 3);
  for (const symbol of QUICK_REACTIONS) if (!list.includes(symbol)) list.push(symbol);
  return list;
}

/** 记下刚用来回应的表情，排到最近用过的最前 */
export function rememberReaction(symbol: string) {
  kv.set(KV_KEYS.recentEmojis, JSON.stringify([symbol, ...readRecent().filter((item) => item !== symbol)].slice(0, 3)));
}
