import { kv, KV_KEYS } from '../../../sync/storage';

/** 输入栏表情面板里的表情 */
export const EMOJIS = Array.from(
  '😀😁😂🤣😊😍😘😎🤔😴😭😡😅🙂😉😇🥳😱😳🤗🤝👍👎👏🙏💪👌✌️🎉❤️💔🔥✅❌⭐🌹☕🍺🎂🚀💯'.match(/\p{Extended_Pictographic}️?/gu) ?? [],
);

/** 消息菜单里的快捷回应 */
export const REACTIONS = ['👍', '❤️', '😂', '🎉', '🙏', '👌', '🔥', '✅'];

/** App 长按菜单表情条的默认表情，前面再放最近用过的 3 个（同旧 App，表情和顺序照旧版 quickEmojis） */
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

/** App 长按菜单的表情条：最近用过的 3 个 + 默认表情（去重） */
export function quickReactions(): string[] {
  const list = readRecent().slice(0, 3);
  for (const symbol of QUICK_REACTIONS) if (!list.includes(symbol)) list.push(symbol);
  return list;
}

/** 记下刚用来回应的表情，排到最近用过的最前 */
export function rememberReaction(symbol: string) {
  kv.set(KV_KEYS.recentEmojis, JSON.stringify([symbol, ...readRecent().filter((item) => item !== symbol)].slice(0, 3)));
}
