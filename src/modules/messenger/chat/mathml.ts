/**
 * LaTeX → MathML（浏览器和系统 WebView 都能直接显示，不用带 KaTeX 的样式和字体）。
 * KaTeX 体积大，用到公式时才加载；公式写错时 KaTeX 把出错处标红，不抛错
 */

const cache = new Map<string, string>();

export function cachedMathML(source: string): string | undefined {
  return cache.get(source);
}

export async function toMathML(source: string): Promise<string> {
  const hit = cache.get(source);
  if (hit !== undefined) return hit;
  const { default: katex } = await import('katex');
  const html = katex.renderToString(source, { output: 'mathml', displayMode: true, throwOnError: false });
  cache.set(source, html);
  return html;
}
