// 新旧版逐屏对比（在测试机上跑：本目录拷到测试机 ~/qa，用那里装的 playwright）。
// 用法：QA_OLD=<旧版地址> QA_NEW=<新版地址> node compare.mjs <屏配置.json> [输出目录]
// 每个屏配置描述：视口、新旧两边的打开地址和准备步骤、要对比的元素（新旧各一个选择器）。
// 输出：<目录>/<屏名>/old.png、new.png、side.png（并排），report.md（尺寸、位置、样式差异表，✗ 为不一致）。
//
// 配置格式（screens 可以有多屏，共用 elements 时写在屏里）：
// {
//   "screens": [{
//     "name": "wide-list",
//     "viewport": [1280, 860],
//     "colorScheme": "light",
//     "old": { "path": "/manage/messenger", "state": "state-old-admin.json", "steps": [] },
//     "new": { "path": "/messenger", "state": "state-admin.json", "steps": [] },
//     "clip": { "old": ".messenger-select", "new": "[aria-label=...]" },   // 可选：只截这块
//     "elements": [
//       { "name": "搜索框", "old": ".search-box", "new": "input[placeholder]", "props": ["height", "border-radius"] }
//     ]
//   }]
// }
// steps：{ "click": 选择器 } { "rightClick": 选择器 } { "hover": 选择器 } { "fill": [选择器, 文字] } { "press": "Escape" }
//        { "wait": 毫秒 } { "waitFor": 选择器 } { "scroll": [选择器, y] } { "eval": "js 表达式" }
// 选择器用 Playwright 语法（css、text=、role= 等都行）；元素匹配多个时取第一个，可在选择器后加 >> nth=2。
// props 不写时用 DEFAULT_PROPS；新旧两边要比的属性不同名时写 "旧|新"（如旧版字体图标的 color 对新版 svg 的 stroke）；"box" 总会比较（宽高，left/top 相对 clip 区域或视口）。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { launch } from './browser.mjs';

const DEFAULT_PROPS = ['font-size', 'font-weight', 'line-height', 'color', 'background-color', 'border-radius', 'padding', 'opacity'];
const PX_TOLERANCE = 1;

const [configPath, outRoot = 'compare-out'] = process.argv.slice(2);
const QA_OLD = process.env.QA_OLD;
const QA_NEW = process.env.QA_NEW;
if (!configPath || !QA_OLD || !QA_NEW) {
  console.error('用法：QA_OLD=<旧版地址> QA_NEW=<新版地址> node compare.mjs <配置.json> [输出目录]');
  process.exit(2);
}
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const browser = await launch([QA_OLD, QA_NEW]);
const summary = [];

try {
  for (const screen of config.screens) {
    const dir = join(outRoot, screen.name);
    mkdirSync(dir, { recursive: true });
    const sides = {};
    for (const side of ['old', 'new']) {
      sides[side] = await capture(screen, side, side === 'old' ? QA_OLD : QA_NEW, dir);
    }
    await sideBySide(dir, screen);
    const rows = compareElements(screen, sides.old.elements, sides.new.elements);
    const bad = rows.filter((r) => r.mark === '✗').length;
    writeFileSync(join(dir, 'report.md'), report(screen, rows, sides));
    summary.push(`${bad ? '✗' : '✓'} ${screen.name}：${rows.length} 项，${bad} 项不一致`);
  }
} finally {
  await browser.close();
}
writeFileSync(join(outRoot, 'summary.md'), summary.join('\n') + '\n');
console.log(summary.join('\n'));

async function capture(screen, side, base, dir) {
  const spec = screen[side];
  const [width, height] = screen.viewport ?? [1280, 860];
  const context = await browser.newContext({
    storageState: spec.state,
    viewport: { width, height },
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    colorScheme: screen.colorScheme ?? 'light',
    isMobile: !!screen.mobile,
    hasTouch: !!screen.mobile,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base.replace(/\/$/, '') + spec.path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(spec.settle ?? 3000);
  for (const step of spec.steps ?? []) {
    try {
      await runStep(page, step);
    } catch (e) {
      // 步骤失败照样截图，报告里写明哪一步没成
      errors.push(`步骤 ${JSON.stringify(step)} 失败：${String(e.message ?? e).split('\n')[0]}`);
      break;
    }
  }
  // 鼠标移开，免得悬停态混进截图；步骤里有意悬停的保留
  if (!spec.steps?.some((s) => s.hover)) {
    await page.mouse.move(0, height - 1).catch(() => {});
    await page.waitForTimeout(300);
  }

  const clipSel = screen.clip?.[side];
  const clip = clipSel ? await box(page, clipSel).catch(() => null) : null;
  await page.screenshot({ path: join(dir, `${side}.png`), clip: clip ?? undefined });

  const elements = {};
  for (const el of screen.elements ?? []) {
    const sel = el[side];
    if (!sel) continue;
    elements[el.name] = await measure(page, sel, el.props ?? DEFAULT_PROPS, side, clip);
  }
  await context.close();
  return { elements, errors };
}

async function runStep(page, step) {
  if (step.click) await page.locator(step.click).first().click();
  else if (step.rightClick) await page.locator(step.rightClick).first().click({ button: 'right' });
  else if (step.hover) await page.locator(step.hover).first().hover();
  else if (step.fill) await page.locator(step.fill[0]).first().fill(step.fill[1]);
  else if (step.press) await page.keyboard.press(step.press);
  else if (step.waitFor) await page.locator(step.waitFor).first().waitFor({ timeout: 15000 });
  else if (step.scroll) await page.locator(step.scroll[0]).first().evaluate((n, y) => n.scrollTo(0, y), step.scroll[1]);
  else if (step.eval) await page.evaluate(step.eval);
  if (step.wait) await page.waitForTimeout(step.wait);
  else if (!step.waitFor) await page.waitForTimeout(400);
}

async function box(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  return b && { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
}

/** 属性写法 "旧|新" 时取这一边的属性名 */
function propOf(spec, side) {
  const [oldProp, newProp = oldProp] = spec.split('|');
  return side === 'old' ? oldProp : newProp;
}

async function measure(page, sel, props, side, clip) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) return { missing: true };
  const b = await loc.boundingBox();
  const style = await loc.evaluate(
    (n, list) => {
      const cs = getComputedStyle(n);
      return Object.fromEntries(list.map(([key, p]) => [key, cs.getPropertyValue(p)]));
    },
    props.map((p) => [p, propOf(p, side)]),
  );
  const text = (await loc.innerText().catch(() => '')).trim().slice(0, 40);
  const ox = clip?.x ?? 0;
  const oy = clip?.y ?? 0;
  return {
    box: b ? { left: round(b.x - ox), top: round(b.y - oy), width: round(b.width), height: round(b.height) } : null,
    style,
    text,
  };
}

function compareElements(screen, oldEls, newEls) {
  const rows = [];
  for (const el of screen.elements ?? []) {
    const o = oldEls[el.name];
    const n = newEls[el.name];
    if (!o || !n || o.missing || n.missing) {
      rows.push({ name: el.name, prop: '存在', old: o?.missing ? '找不到' : '有', new: n?.missing ? '找不到' : '有', mark: '✗' });
      continue;
    }
    const skip = new Set(el.ignore ?? []);
    for (const k of ['width', 'height', 'left', 'top']) {
      if (skip.has(k)) continue;
      const a = o.box?.[k];
      const b = n.box?.[k];
      rows.push({ name: el.name, prop: k, old: a, new: b, mark: Math.abs((a ?? 0) - (b ?? 0)) <= PX_TOLERANCE ? '' : '✗' });
    }
    for (const p of el.props ?? DEFAULT_PROPS) {
      if (skip.has(p)) continue;
      const a = norm(o.style[p]);
      const b = norm(n.style[p]);
      rows.push({ name: el.name, prop: p, old: a, new: b, mark: same(a, b) ? '' : '✗' });
    }
    if (el.text) rows.push({ name: el.name, prop: 'text', old: o.text, new: n.text, mark: o.text === n.text ? '' : '✗' });
  }
  return rows;
}

function norm(v = '') {
  return v
    .trim()
    .replace(/rgba\((\d+), (\d+), (\d+), 1\)/g, 'rgb($1, $2, $3)')
    .replace(/\b0px\b/g, '0')
    .replace(/(\d+\.\d{2})\d+px/g, '$1px');
}

// 数值（px）差 1 以内算一致；其余逐字比较
function same(a, b) {
  if (a === b) return true;
  const na = a.match(/-?\d+(\.\d+)?/g);
  const nb = b.match(/-?\d+(\.\d+)?/g);
  if (!na || !nb || na.length !== nb.length) return false;
  if (a.replace(/-?\d+(\.\d+)?/g, '#') !== b.replace(/-?\d+(\.\d+)?/g, '#')) return false;
  const isColor = /rgb/.test(a);
  return na.every((x, i) => Math.abs(Number(x) - Number(nb[i])) <= (isColor ? 2 : PX_TOLERANCE));
}

function round(n) {
  return Math.round(n * 10) / 10;
}

async function sideBySide(dir, screen) {
  const page = await browser.newPage({ viewport: { width: 400, height: 300 }, deviceScaleFactor: 1 });
  const img = (f) => `data:image/png;base64,${readFileSync(join(dir, f)).toString('base64')}`;
  await page.setContent(`<body style="margin:0;display:flex;gap:12px;background:#888;padding:12px;font:14px sans-serif;align-items:flex-start">
    <figure style="margin:0"><figcaption>旧版 ${screen.name}</figcaption><img src="${img('old.png')}"></figure>
    <figure style="margin:0"><figcaption>新版 ${screen.name}</figcaption><img src="${img('new.png')}"></figure></body>`);
  await page.screenshot({ path: join(dir, 'side.png'), fullPage: true });
  await page.close();
}

function report(screen, rows, sides) {
  const lines = [`# ${screen.name}`, '', `视口 ${screen.viewport?.join('×') ?? '1280×860'}，截图 old.png / new.png / side.png`, ''];
  for (const side of ['old', 'new']) {
    if (sides[side].errors.length) lines.push(`${side} 页面报错：${sides[side].errors.join('；')}`, '');
  }
  lines.push('| 元素 | 属性 | 旧版 | 新版 | |', '|---|---|---|---|---|');
  for (const r of rows) lines.push(`| ${r.name} | ${r.prop} | ${r.old ?? ''} | ${r.new ?? ''} | ${r.mark} |`);
  return lines.join('\n') + '\n';
}
