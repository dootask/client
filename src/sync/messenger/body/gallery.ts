import type { Block, MsgBody } from './types';

/**
 * 会话画廊：图片消息，以及正文里有原图的图片（含引用、思考过程、列表里的；表情没有原图，不算）
 */

/** 一张图：缩略图和原图 */
export interface Picture {
  src: string;
  url: string;
}

function blockPictures(blocks: readonly Block[], out: Picture[]) {
  for (const block of blocks) {
    if (block.t === 'img') {
      if (block.url) out.push({ src: block.src, url: block.url });
    } else if (block.t === 'quote' || block.t === 'reasoning' || block.t === 'details') {
      blockPictures(block.blocks, out);
    } else if (block.t === 'list') {
      for (const item of block.items) blockPictures(item.blocks, out);
    }
  }
}

/** 一条消息里能放进画廊的图（缩略图 + 原图），按出现顺序 */
export function bodyPictures(body: MsgBody): Picture[] {
  if (body.kind === 'image') return [{ src: body.src, url: body.url }];
  if (body.kind !== 'rich') return [];
  const out: Picture[] = [];
  blockPictures(body.blocks, out);
  return out;
}

/** 一条消息里能放进画廊的原图，按出现顺序 */
export function bodyImages(body: MsgBody): string[] {
  return bodyPictures(body).map((p) => p.url);
}
