import type { Msg } from '../../../sync/api/dialog';
import { bodyPictures, type Block, type MsgBody, type Picture, type Run } from '../../../sync/messenger/body';
import { msgPreview, type Preview } from '../../../sync/messenger/preview';

const SEARCH_LEAD = 12;

export function highlightParts(text: string, key: string) {
  const at = key ? text.toLowerCase().indexOf(key.toLowerCase()) : -1;
  if (at < 0) return { before: text, match: '', after: '' };
  const start = Math.max(0, at - SEARCH_LEAD);
  return { before: `${start ? '…' : ''}${text.slice(start, at)}`, match: text.slice(at, at + key.length), after: text.slice(at + key.length) };
}

function runsOf(blocks: readonly Block[]): Run[] {
  return blocks.flatMap((block): Run[] => {
    switch (block.t) {
      case 'p':
      case 'h':
        return [...block.runs, { text: ' ' }];
      case 'quote':
      case 'reasoning':
        return runsOf(block.blocks);
      case 'details':
        return [...block.summary, { text: ' ' }, ...runsOf(block.blocks)];
      case 'list':
        return block.items.flatMap((item) => runsOf(item.blocks));
      case 'table':
        return block.rows.flatMap((row) => row.flatMap((cell) => [...cell, { text: ' ' }]));
      case 'code':
      case 'math':
        return [{ text: block.text }, { text: ' ' }];
      default:
        return [];
    }
  });
}

export function firstHref(body: MsgBody): string | undefined {
  if (body.kind !== 'rich' && body.kind !== 'wordChain') return undefined;
  return runsOf(body.blocks).find((run) => !!run.href)?.href;
}

export function resultPreview(msg: Msg, body: MsgBody): Preview {
  const preview = msgPreview(msg) ?? { labels: [], text: '' };
  if (body.kind !== 'rich' || preview.status) return preview;
  return { ...preview, text: runsOf(body.blocks).map((run) => run.text).join('').replace(/\s+/g, ' ').trim() };
}

export function earlierCursor(page: readonly Msg[]): number {
  const oldest = page[page.length - 1];
  return oldest && (oldest.prev_id ?? 0) > 0 ? oldest.id - 1 : 0;
}

export function appendPage(current: readonly Msg[], page: readonly Msg[]): Msg[] {
  const seen = new Set(current.map((msg) => msg.id));
  return [...current, ...page.filter((msg) => !seen.has(msg.id))];
}

export type PictureRow = { key: string; day: string; pictures: (Picture & { key: string; msgId: number })[] };

export function pictureRows(items: readonly { msg: Msg; body: MsgBody }[], columns: number): PictureRow[] {
  const rows: PictureRow[] = [];
  let lastDay = '';
  let row: PictureRow | undefined;
  for (const { msg, body } of items) {
    const day = msg.created_at.slice(0, 10);
    bodyPictures(body).forEach((picture, index) => {
      if (!row || day !== lastDay || row.pictures.length === columns) {
        row = { key: `${msg.id}:${index}`, day: day !== lastDay ? day : '', pictures: [] };
        rows.push(row);
      }
      row.pictures.push({ ...picture, key: `${msg.id}:${index}`, msgId: msg.id });
      lastDay = day;
    });
  }
  return rows;
}
