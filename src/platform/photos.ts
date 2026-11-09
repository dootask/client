import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { getPermissionsAsync, MediaType, Query, requestPermissionsAsync, AssetField } from 'expo-media-library';
import { Linking } from 'react-native';

import type { PickedFile } from './filesTypes';
import { RECENT_ORDER } from './photoOrder';

/**
 * 加号面板的最近照片，以及发送前的压缩（没勾原图时）
 */

/** 有没有最近照片条（Web 没有） */
export const HAS_RECENT_PHOTOS = true;
/** 能不能压缩（不能时不显示「原图」开关） */
export const CAN_COMPRESS = true;

const RECENT_COUNT = 20;
/** 不勾原图时的长边上限与 JPEG 质量；已经够小的图不重新编码 */
const COMPRESS_SIDE = 1920;
const COMPRESS_QUALITY = 0.8;
const COMPRESS_MIN_BYTES = 300 * 1024;

/** granted：可读；ask：还能弹系统授权；denied：只能去系统设置里开 */
export type PhotoAccess = 'granted' | 'ask' | 'denied';

export async function photoAccess(request = false): Promise<PhotoAccess> {
  const permission = await (request ? requestPermissionsAsync(false, ['photo']) : getPermissionsAsync(false, ['photo']));
  if (permission.granted) return 'granted';
  return permission.canAskAgain ? 'ask' : 'denied';
}

export const openPhotoSettings = () => void Linking.openSettings().catch(() => {});

const mimeOf = (name: string) =>
  /\.png$/i.test(name) ? 'image/png' : /\.gif$/i.test(name) ? 'image/gif' : /\.heic$/i.test(name) ? 'image/heic' : 'image/jpeg';

export async function loadRecentPhotos(): Promise<PickedFile[]> {
  const assets = await new Query()
    .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
    .orderBy({ key: RECENT_ORDER, ascending: false })
    .limit(RECENT_COUNT)
    .exe();
  return Promise.all(
    assets.map(async (asset) => {
      const [uri, name, shape] = await Promise.all([asset.getUri(), asset.getFilename(), asset.getShape()]);
      return {
        uri,
        name,
        size: new File(uri).size,
        mimeType: mimeOf(name),
        media: { kind: 'image' as const, width: shape?.width ?? 0, height: shape?.height ?? 0 },
      };
    }),
  );
}

/** 压缩一张图；视频、动图和够小的图原样返回，压缩失败或反而变大也用原图 */
export async function compressPhoto(file: PickedFile): Promise<PickedFile> {
  const { media } = file;
  if (media?.kind !== 'image' || file.mimeType === 'image/gif') return file;
  const longest = Math.max(media.width, media.height);
  if (longest <= COMPRESS_SIDE && file.size <= COMPRESS_MIN_BYTES) return file;
  const context = ImageManipulator.manipulate(file.uri);
  try {
    if (longest > COMPRESS_SIDE) context.resize(media.width >= media.height ? { width: COMPRESS_SIDE } : { height: COMPRESS_SIDE });
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: COMPRESS_QUALITY });
      const size = new File(saved.uri).size;
      if (size >= file.size) return file;
      return {
        uri: saved.uri,
        name: file.name.replace(/\.[^.]*$/, '') + '.jpg',
        size,
        mimeType: 'image/jpeg',
        media: { kind: 'image', width: saved.width, height: saved.height },
      };
    } finally {
      image.release();
    }
  } catch {
    return file;
  } finally {
    context.release();
  }
}
