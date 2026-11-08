/**
 * 用户输入的地址 → 依次尝试的地址：去掉首尾空白、结尾的斜杠和 /api；没写协议先试 https 再试 http。
 * 写了别的协议、只有协议或者是空的返回空数组
 */
export function serverCandidates(input: string): string[] {
  const match = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i.exec(input.trim());
  const scheme = match ? match[1] : null;
  const rest = (match ? match[2] : input.trim()).replace(/\/+$/, '').replace(/\/api$/i, '');
  if (!rest || rest.startsWith('/')) return [];
  if (scheme === null) return [`https://${rest}`, `http://${rest}`];
  return /^https?$/i.test(scheme) ? [`${scheme}://${rest}`] : [];
}
