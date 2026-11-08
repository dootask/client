// 本机预览 Web 导出产物（dist/），模拟部署在子路径下：
// 子路径下的文件照常返回，其余页面地址一律回落到 index.html（单页应用刷新时需要）。
// expo serve 不处理子路径和回落，所以自己写。用法：node scripts/serve-web.mjs [端口]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

// 与 app.config.ts 的 experiments.baseUrl 一致
const BASE = '/next';
const PORT = Number(process.argv[2] ?? 2211);
const DIST = path.resolve(import.meta.dirname, '../dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

function send(res, file) {
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('没有 dist/index.html，先运行 npm run web:export');
  process.exit(1);
}

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    if (pathname !== BASE && !pathname.startsWith(`${BASE}/`)) {
      res.writeHead(302, { Location: `${BASE}/` });
      res.end();
      return;
    }
    const file = path.join(DIST, pathname.slice(BASE.length));
    if (file.startsWith(`${DIST}${path.sep}`) && fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
      send(res, file);
    } else if (path.extname(pathname)) {
      // 带扩展名的是资源文件，找不到就是 404，不回落到页面
      res.writeHead(404);
      res.end();
    } else {
      send(res, path.join(DIST, 'index.html'));
    }
  })
  .listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}/`));
