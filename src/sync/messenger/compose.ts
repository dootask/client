/**
 * 输入栏纯文本与消息 HTML 互转。发送、草稿都存 HTML（与旧前端的编辑器格式一致，草稿两端通用），
 * 输入栏只编辑纯文本：一行一个段落
 */

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&' };

/** 纯文本 → HTML：每行一个 `<p>`，空行写 `<br>`；首尾空行去掉 */
export function textToHtml(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').replace(/^\n+|\s+$/g, '').split('\n');
  return lines.map((line) => `<p>${line ? line.replace(/[&<>]/g, (c) => ESCAPES[c]!) : '<br>'}</p>`).join('');
}

/** HTML → 纯文本：段落、换行变成换行，表情图换成 [名字]，其余标签去掉 */
export function htmlToText(html: string): string {
  return html
    .replace(/<img\s+class="emoticon"[^>]*?alt="([^"]+)"[^>]*?>/g, '[$1]')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(nbsp|quot|#39|lt|gt|amp);/g, (m) => ENTITIES[m]!)
    .replace(/\n\n/g, '\n')
    .replace(/^\n+|\s+$/g, '');
}
