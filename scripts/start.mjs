// 启动 Metro（原生 bundle 和 Web 开发页共用）。
// 端口固定：开发包里记着 Metro 的外网地址，换了端口就连不上，所以被占用时直接报错退出，不换端口。
// 外网地址：EXPO_PACKAGER_PROXY_URL 优先；没设时按 VSCODE_PROXY_URI 的 {{port}} 模板推导；
// 都没有就由 Expo 自己取局域网地址。Expo 只从命令行环境读这个变量，写在 .env 文件里不生效。
// 并行开发的 worktree 用 METRO_PORT 换端口（只给网页开发页用，开发包仍连 2210）。
import { spawn } from 'node:child_process';
import net from 'node:net';

const PORT = Number(process.env.METRO_PORT) || 2210;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port);
  });
}

if (!(await isPortFree(PORT))) {
  console.error(`端口 ${PORT} 被占用，Metro 没有启动。多半是上一次的 Metro 没关，用 \`ss -ltnp | grep :${PORT}\` 查是谁占的。`);
  process.exit(1);
}

// App 全屏编辑页的内联脚本（改了 src/embed/editor/core.ts 后重启 Metro 即重新生成）
await import('./editor-page.mjs');

const env = { ...process.env };
if (!env.EXPO_PACKAGER_PROXY_URL && env.VSCODE_PROXY_URI) {
  env.EXPO_PACKAGER_PROXY_URL = env.VSCODE_PROXY_URI.replace('{{port}}', String(PORT)).replace(/\/+$/, '');
}
if (env.EXPO_PACKAGER_PROXY_URL) {
  console.log(`Metro 外网地址：${env.EXPO_PACKAGER_PROXY_URL}`);
}

const child = spawn('npx', ['expo', 'start', '--dev-client', '--port', String(PORT), ...process.argv.slice(2)], {
  env,
  stdio: 'inherit',
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
