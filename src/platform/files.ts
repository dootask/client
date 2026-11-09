import * as DocumentPicker from 'expo-document-picker';
import { File, FileMode, Paths, UploadTask, UploadType } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import type { FileIO, PickedFile, UploadBody } from './filesTypes';

/**
 * 原生端选文件、传文件：相册、相机、文件三个来源；上传走原生的 UploadTask，大文件按片写进缓存再传
 */

export type { PickedFile } from './filesTypes';

/** 能不能直接拍摄 */
export const CAN_CAPTURE = true;

/** 一次最多选几张（与旧前端一致：每张一条消息） */
const LIBRARY_LIMIT = 9;

export class CameraDenied extends Error {}

function fromAsset(asset: ImagePicker.ImagePickerAsset): PickedFile {
  const video = asset.type === 'video';
  return {
    uri: asset.uri,
    name: asset.fileName || asset.uri.split('/').pop() || (video ? 'video.mp4' : 'image.jpg'),
    size: asset.fileSize ?? new File(asset.uri).size,
    mimeType: asset.mimeType ?? (video ? 'video/mp4' : 'image/jpeg'),
    media: {
      kind: video ? 'video' : 'image',
      width: asset.width,
      height: asset.height,
    },
  };
}

/** 相册：图片和视频，取消时返回空数组 */
export async function pickMedia(): Promise<PickedFile[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    selectionLimit: LIBRARY_LIMIT,
    orderedSelection: true,
  });
  return result.canceled ? [] : result.assets.map(fromAsset);
}

/** 拍照或录像；没有相机权限时 reject CameraDenied */
export async function capture(): Promise<PickedFile[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new CameraDenied();
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images', 'videos'],
  });
  return result.canceled ? [] : result.assets.map(fromAsset);
}

/** 任意文件 */
export async function pickDocuments(): Promise<PickedFile[]> {
  // 拷到缓存：Android 的 content 地址读不到原名，上传也不必再依赖临时读取授权
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    uri: asset.uri,
    name: asset.name,
    size: asset.size ?? new File(asset.uri).size,
    mimeType: asset.mimeType || 'application/octet-stream',
  }));
}

/** 录好的语音（expo-audio 录在缓存里的 m4a）登记成待发送的本地文件 */
export async function recordedFile(uri: string): Promise<PickedFile> {
  return { uri, name: uri.split('/').pop() || 'record.m4a', size: new File(uri).size, mimeType: 'audio/mp4' };
}

let chunkSeq = 0;

/** 原生上传只收文件：片也是缓存里的临时文件 */
function fileOf(body: UploadBody): File {
  return 'uri' in body ? new File(body.uri) : (body.chunk as File);
}

export const fileIO: FileIO = {
  md5: (file) => new File(file.uri).digest('MD5'),

  async slice(file, offset, length) {
    const handle = new File(file.uri).open(FileMode.ReadOnly);
    try {
      handle.offset = offset;
      const part = new File(Paths.cache, `upload-${Date.now()}-${++chunkSeq}`);
      part.create({ overwrite: true });
      await part.write(await handle.readBytes(length));
      return { part: { chunk: part }, dispose: () => part.delete() };
    } finally {
      handle.close();
    }
  },

  async post({ url, headers, fields, fieldName, body, mimeType, signal, onProgress }) {
    const task = new UploadTask(fileOf(body), url, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      headers,
      fieldName,
      mimeType,
      parameters: fields,
      onProgress: ({ bytesSent, totalBytes }) => {
        if (totalBytes > 0) onProgress(Math.min(1, bytesSent / totalBytes));
      },
    });
    const cancel = () => task.cancel();
    signal.addEventListener('abort', cancel);
    try {
      const { status, body: text } = await task.uploadAsync();
      return { status, body: text };
    } finally {
      signal.removeEventListener('abort', cancel);
      task.release();
    }
  },

  base64: (file) => new File(file.uri).base64(),

  // 缓存里的文件交给系统清理
  release: () => {},
};
