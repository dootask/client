import type { PickedFile } from './filesTypes';

/**
 * Web 没有最近照片条，发送前也不压缩（浏览器里拖进来、粘贴进来的多是截图，按原样发）
 */

export const HAS_RECENT_PHOTOS = false;
export const CAN_COMPRESS = false;

export type PhotoAccess = 'granted' | 'ask' | 'denied';

export const photoAccess = async (): Promise<PhotoAccess> => 'denied';
export const openPhotoSettings = () => {};
export const loadRecentPhotos = async (): Promise<PickedFile[]> => [];
export const compressPhoto = async (file: PickedFile): Promise<PickedFile> => file;
