// 翻译检查（npm run check 的一部分）：
// 1. 每种语言的命名空间、键和 zh（源语言）完全一致，没有缺译、多余的键和空译文
// 2. 插值参数 {{name}} 和 zh 一致
// 3. zh 的每个键都在 src 里以字面量出现（"ns:key" 或 "key"），没有用不到的键；
//    复数键（_one、_other …）按去掉后缀的键查
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LOCALES = path.join(ROOT, 'locales');
const SRC = path.join(ROOT, 'src');
const SOURCE = 'zh';
const LANGUAGES = ['zh', 'zh-CHT', 'en', 'ko', 'ja', 'de', 'fr', 'id', 'ru'];
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

const errors = [];

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

function readNamespaces(lang) {
  const dir = path.join(LOCALES, lang);
  if (!fs.existsSync(dir)) {
    errors.push(`缺少语言目录 locales/${lang}`);
    return {};
  }
  const result = {};
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    result[path.basename(file, '.json')] = flatten(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
  }
  return result;
}

const params = (text) => [...String(text).matchAll(/\{\{\s*([\w.]+)[^}]*\}\}/g)].map((m) => m[1]).sort().join(',');

const extraDirs = fs.readdirSync(LOCALES).filter((d) => !LANGUAGES.includes(d));
if (extraDirs.length) errors.push(`locales 下有不认识的语言目录：${extraDirs.join('、')}`);

const source = readNamespaces(SOURCE);
for (const lang of LANGUAGES) {
  const target = lang === SOURCE ? source : readNamespaces(lang);
  for (const ns of new Set([...Object.keys(source), ...Object.keys(target)])) {
    const s = source[ns];
    const t = target[ns];
    if (!s) {
      errors.push(`${lang}/${ns}.json：zh 没有这个命名空间`);
      continue;
    }
    if (!t) {
      errors.push(`${lang}/${ns}.json：缺少文件`);
      continue;
    }
    for (const key of Object.keys(s)) {
      if (!(key in t)) errors.push(`${lang}/${ns}.json：缺译 ${key}`);
      else if (typeof t[key] !== 'string' || !t[key].trim()) errors.push(`${lang}/${ns}.json：空译文 ${key}`);
      else if (params(t[key]) !== params(s[key])) errors.push(`${lang}/${ns}.json：${key} 的插值参数和 zh 不一致`);
    }
    for (const key of Object.keys(t)) {
      if (!(key in s)) errors.push(`${lang}/${ns}.json：zh 没有的键 ${key}`);
    }
  }
}

function readSources(dir) {
  let text = '';
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) text += readSources(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|d)\.ts$/.test(entry.name)) text += fs.readFileSync(full, 'utf8');
  }
  return text;
}

const code = readSources(SRC);
for (const [ns, keys] of Object.entries(source)) {
  for (const key of new Set(Object.keys(keys).map((k) => k.replace(PLURAL_SUFFIX, '')))) {
    const literals = [`${ns}:${key}`, ...(ns === 'common' ? [key] : [])];
    const used = literals.some((l) => code.includes(`'${l}'`) || code.includes(`"${l}"`) || code.includes(`\`${l}\``));
    if (!used) errors.push(`zh/${ns}.json：没有用到的键 ${key}（代码里要写成 '${ns}:${key}'${ns === 'common' ? ` 或 '${key}'` : ''}）`);
  }
}

if (errors.length) {
  console.error(`翻译检查没通过（${errors.length} 处）：\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
console.log(`翻译检查通过：${LANGUAGES.length} 种语言，${Object.keys(source).length} 个命名空间`);
