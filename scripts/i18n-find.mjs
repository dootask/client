// 按中文原文到主仓库 language/translate.json 查旧前端的现成译文
// 用法：npm run i18n:find -- 仪表盘 项目 …（主仓库位置默认是本项目旁边的 ../dootask，可用 DOOTASK_REPO 指定）
import fs from 'node:fs';
import path from 'node:path';

const repo = process.env.DOOTASK_REPO ?? path.resolve(import.meta.dirname, '../../dootask');
const file = path.join(repo, 'language/translate.json');
if (!fs.existsSync(file)) {
  console.error(`找不到 ${file}，用 DOOTASK_REPO 指定主仓库位置`);
  process.exit(1);
}

const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
const byKey = new Map(entries.map((e) => [e.key, e]));

for (const word of process.argv.slice(2)) {
  const hit = byKey.get(word);
  if (!hit) {
    const near = entries.filter((e) => e.key.includes(word)).slice(0, 5).map((e) => e.key);
    console.log(`✗ ${word}${near.length ? `（相近：${near.join('、')}）` : ''}`);
    continue;
  }
  const { key, ...langs } = hit;
  langs.zh = langs.zh || key;
  console.log(`✓ ${word} ${JSON.stringify(langs)}`);
}
