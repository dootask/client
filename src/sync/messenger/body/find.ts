import type { Block, Run } from './types';

/**
 * 长文页内查找（同旧版 App）：返回带高亮的新块，以及每处命中所在的顶层块下标（用于滚动定位）。
 * 只在单个文字片段内匹配，跨粗体等样式边界的不算；current 是当前定位的那一处
 */
export function findInBlocks(blocks: Block[], query: string, current: number): { blocks: Block[]; matches: number[] } {
  const needle = query.toLowerCase();
  const matches: number[] = [];
  if (!needle) return { blocks, matches };
  let top = 0;

  const markRuns = (runs: Run[]): Run[] =>
    runs.flatMap((run) => {
      const haystack = run.text.toLowerCase();
      const parts: Run[] = [];
      let from = 0;
      for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, from)) {
        if (at > from) parts.push({ ...run, text: run.text.slice(from, at) });
        parts.push({ ...run, text: run.text.slice(at, at + needle.length), hl: matches.length === current ? 'current' : 'match' });
        matches.push(top);
        from = at + needle.length;
      }
      if (from === 0) return [run];
      if (from < run.text.length) parts.push({ ...run, text: run.text.slice(from) });
      return parts;
    });

  const markBlock = (block: Block): Block => {
    switch (block.t) {
      case 'p':
      case 'h':
        return { ...block, runs: markRuns(block.runs) };
      case 'quote':
      case 'reasoning':
        return { ...block, blocks: block.blocks.map(markBlock) };
      case 'details':
        return { ...block, summary: markRuns(block.summary), blocks: block.blocks.map(markBlock) };
      case 'list':
        return { ...block, items: block.items.map((item) => ({ ...item, blocks: item.blocks.map(markBlock) })) };
      case 'code':
        return { ...block, runs: markRuns([{ text: block.text }]) };
      case 'table':
        return { ...block, rows: block.rows.map((row) => row.map(markRuns)) };
      default:
        return block;
    }
  };

  const marked = blocks.map((block, index) => {
    top = index;
    return markBlock(block);
  });
  return { blocks: marked, matches };
}
