/**
 * 图片显示尺寸：按原图比例缩进最大框；没有尺寸时用固定占位，图片晚到不改变行高（A6）
 */

export interface Box {
  width: number;
  height: number;
}

/** 图片、视频消息 */
export const MEDIA_BOX: Box = { width: 240, height: 320 };
/** 只有一张表情图的消息 */
export const STICKER_BOX: Box = { width: 140, height: 140 };
/** 富文本里的图片 */
export const INLINE_IMAGE_BOX: Box = { width: 220, height: 280 };

const MIN_SIDE = 64;

export function fitSize(width: number, height: number, box: Box): Box {
  if (!(width > 0 && height > 0)) return { width: box.width, height: Math.round(box.width * 0.75) };
  const scale = Math.min(1, box.width / width, box.height / height);
  return {
    width: Math.max(MIN_SIDE, Math.round(width * scale)),
    height: Math.max(MIN_SIDE, Math.round(height * scale)),
  };
}
