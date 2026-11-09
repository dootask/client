import { AssetField } from 'expo-media-library';

/** 最近照片按什么排：Android 没有 EXIF 的图（下载、保存的）拍摄时间为空，按修改时间才排得到前面 */
export const RECENT_ORDER = AssetField.MODIFICATION_TIME;
