import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** 举报截图保留原始元数据，网页上传前按旧版校验格式与 10MB 限制 */
export type ReportImage = Pick<ImagePicker.ImagePickerAsset, 'uri' | 'width' | 'height' | 'fileName' | 'fileSize' | 'mimeType'>;

export const REPORT_IMAGE_MAX = 5;
export const REPORT_IMAGE_SIDE = 2048;
export const REPORT_IMAGE_BYTES = 10 * 1024 * 1024;
const AVATAR_SIDE = 512;

/** 释放选择器或编码器生成的浏览器临时地址；原生的 file / content 地址不需要处理 */
export function releaseImage({ uri }: { uri: string }) {
  if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
}

/** 复用 Expo 现有编码能力；截图按比例缩小，头像由选择器先裁成正方形 */
export async function encodeImage(uri: string, resize?: { width?: number; height?: number }, crop?: { originX: number; originY: number; width: number; height: number }): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  try {
    if (crop) context.crop(crop);
    if (resize) context.resize(resize);
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
      try {
        if (!saved.base64) throw new Error('Image encoding failed');
        return `data:image/jpeg;base64,${saved.base64}`;
      } finally {
        releaseImage(saved);
      }
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

/** 头像：选一张并裁剪，返回可直接交给 uploadAvatar 的 image64；取消不上传 */
export async function pickAvatar(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1] });
  if (result.canceled) return null;
  const image = result.assets[0];
  if (!image) return null;
  try {
    // 网页选择器不提供编辑器，非正方形图先居中裁剪，避免缩成头像时拉伸。
    const side = Math.min(image.width, image.height);
    const crop = image.width !== image.height && side > 0
      ? { originX: Math.floor((image.width - side) / 2), originY: Math.floor((image.height - side) / 2), width: side, height: side }
      : undefined;
    return await encodeImage(image.uri, { width: AVATAR_SIDE, height: AVATAR_SIDE }, crop);
  } finally {
    releaseImage(image);
  }
}

/** 只选图片，取消返回空数组；Web 的选择器不支持 selectionLimit，所以返回时再截断 */
export async function pickReportImages(limit: number): Promise<ReportImage[]> {
  const count = Math.min(REPORT_IMAGE_MAX, Math.max(0, Math.floor(limit)));
  if (!count) return [];
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: count, orderedSelection: true });
  if (result.canceled) return [];
  result.assets.slice(count).forEach(releaseImage);
  return result.assets.slice(0, count).map(({ uri, width, height, fileName, fileSize, mimeType }) => ({ uri, width, height, fileName, fileSize, mimeType }));
}

/** App 旧版仅限制宽度；网页截图缩到 2048×2048 内，服务端仍按 percentage 再校验 */
export function encodeReportImage(image: ReportImage, fitBothSides: boolean): Promise<string> {
  const side = fitBothSides ? Math.max(image.width, image.height) : image.width;
  const resize = side > REPORT_IMAGE_SIDE
    ? fitBothSides && image.height > image.width ? { height: REPORT_IMAGE_SIDE } : { width: REPORT_IMAGE_SIDE }
    : undefined;
  return encodeImage(image.uri, resize);
}
