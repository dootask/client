import type { Msg } from '../../../sync/api/dialog';
import { bodyImages, msgContent, type BodyContext } from '../../../sync/messenger/body';
import { openMedia, type PictureItem } from '../../media';

export interface GalleryOptions {
  /** 已加载的消息，从早到晚 */
  msgs: readonly Msg[];
  ctx: BodyContext;
  /** 点的那张 */
  url: string;
  /** 哪些消息能转发（长按菜单里的「转发」） */
  canForward?: (msg: Msg) => boolean;
  onForward?: (id: number) => void;
  /** 从 prevId 往更早取一页带图的消息（按 id 倒序）；不给时翻到头就停 */
  older?: (prevId: number) => Promise<Msg[]>;
}

function itemsOf(msgs: readonly Msg[], ctx: BodyContext, canForward?: (msg: Msg) => boolean): PictureItem[] {
  return msgs.flatMap((msg) => {
    const id = canForward?.(msg) ? msg.id : undefined;
    return bodyImages(msgContent(msg, ctx).body).map((url) => ({ url, id }));
  });
}

/** 打开会话画廊：已加载消息里的图从早到晚排开，停在点的那张；翻到最早一张时再向服务器要更早的 */
export function openGallery({ msgs, ctx, url, canForward, onForward, older }: GalleryOptions) {
  const items = itemsOf(msgs, ctx, canForward);
  const position = items.findIndex((item) => item.url === url);
  let cursor = msgs.length > 0 ? msgs[0].id - 1 : 0;
  const loadOlder = older
    ? async (): Promise<PictureItem[]> => {
        // 一页里可能没有能看的原图（如只有表情），接着往前取，直到取到图或到头
        while (cursor > 0) {
          const page = await older(cursor);
          if (page.length === 0) break;
          cursor = Math.min(...page.map((msg) => msg.id)) - 1;
          const found = itemsOf([...page].reverse(), ctx, canForward);
          if (found.length > 0) return found;
        }
        cursor = 0;
        return [];
      }
    : undefined;
  // 点的图不在列表里（如消息还没解析出原图）时只看这一张
  if (position < 0) openMedia({ kind: 'pictures', items: [{ url }], position: 0 });
  else openMedia({ kind: 'pictures', items, position, loadOlder, onForward });
}
