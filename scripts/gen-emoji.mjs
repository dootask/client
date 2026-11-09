#!/usr/bin/env node
/**
 * 从主仓库的表情数据（public/js/emoji.all.js、emoticon.all.js，旧网页表情面板用的同一份）
 * 生成 src/sync/messenger/emojiData.ts。主仓库的表情有增减时重新跑一次：
 *   node scripts/gen-emoji.mjs <主仓库目录>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = process.argv[2];
if (!root) {
  console.error('用法：node scripts/gen-emoji.mjs <主仓库目录>');
  process.exit(1);
}

/** 两个文件是往 window 上挂数组的脚本（带注释，不是 JSON），在空白上下文里执行后取出 */
function load(file, name) {
  const window = {};
  runInNewContext(readFileSync(join(root, 'public/js', file), 'utf8'), { window });
  return window[name];
}

// 分类顺序同旧网页面板：人物、自然、食物、符号、活动、出行、物品、旗帜
const CATEGORIES = ['p', 'n', 'd', 's', 'a', 't', 'o', 'f'];
const decode = (code) => code.replace(/&#(\d+);/g, (_, point) => String.fromCodePoint(Number(point)));

const emojis = load('emoji.all.js', 'emojiData');
const groups = CATEGORIES.map((type) => ({
  type,
  emojis: emojis
    .filter((item) => item.category === type)
    .sort((a, b) => Number(a.emoji_order) - Number(b.emoji_order))
    .map((item) => decode(item.code_decimal))
    .join(' '),
}));

const packs = load('emoticon.all.js', 'emoticonData').map(({ name, path, icon, list }) => ({
  name,
  path,
  icon,
  items: list.map((item) => [item.name, item.path, item.key ? String(item.key) : '']),
}));

const out = `// 由 scripts/gen-emoji.mjs 从主仓库 public/js/emoji.all.js、emoticon.all.js 生成，不要手改

/** emoji 分类：type 同旧网页（p 人物、n 自然、d 食物、s 符号、a 活动、t 出行、o 物品、f 旗帜），emojis 用空格隔开 */
export const EMOJI_GROUPS = ${JSON.stringify(groups, null, 1)} as const;

/** 表情包：图片在服务器 images/emoticon/{path}/ 下；每项是 [名称, 文件名, 空格隔开的关键词] */
export const EMOTICON_PACKS: readonly { name: string; path: string; icon: string; items: readonly (readonly [string, string, string])[] }[] = ${JSON.stringify(packs)};
`;
writeFileSync(new URL('../src/sync/messenger/emojiData.ts', import.meta.url), out);
console.log(`emoji ${emojis.length} 个，表情包 ${packs.length} 套`);
