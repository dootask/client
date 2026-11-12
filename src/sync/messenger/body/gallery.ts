import type { Block, MsgBody } from './types';

/**
 * 会话画廊：图片消息，以及正文里有原图的图片（含引用、思考过程、列表里的；表情没有原图，不算）
 */

function blockImages(blocks: readonly Block[], out: string[]) {
  for (const block of blocks) {
    if (block.t === 'img') {
      if (block.url) out.push(block.url);
    } else if (block.t === 'quote' || block.t === 'reasoning' || block.t === 'details') {
      blockImages(block.blocks, out);
    } else if (block.t === 'list') {
      for (const item of block.items) blockImages(item.blocks, out);
    }
  }
}

/** 一条消息里能放进画廊的原图，按出现顺序 */
export function bodyImages(body: MsgBody): string[] {
  if (body.kind === 'image') return [body.url];
  if (body.kind !== 'rich') return [];
  const out: string[] = [];
  blockImages(body.blocks, out);
  return out;
}
