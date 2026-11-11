// 测试机启动测试浏览器统一用这个：测试地址的域名同时有 IPv6 记录，测试机连不通，
// Chromium 默认走 IPv6 会报 ERR_ADDRESS_UNREACHABLE；这里先查出 IPv4，让浏览器只用它
import { lookup } from 'node:dns/promises';
// eslint-disable-next-line import/no-unresolved -- 只在测试机上跑，playwright 装在那边
import { chromium } from 'playwright';

export async function launch(urls, options = {}) {
  const rules = [];
  for (const url of urls.filter(Boolean)) {
    const host = new URL(url).hostname;
    const { address } = await lookup(host, { family: 4 });
    rules.push(`MAP ${host} ${address}`);
  }
  return chromium.launch({ ...options, args: [...(options.args ?? []), `--host-resolver-rules=${rules.join(',')}`] });
}
