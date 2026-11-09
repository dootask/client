import SparkMD5 from 'spark-md5';

import type { FileIO, PickedFile, UploadBody } from './filesTypes';

/**
 * Web 选文件、传文件：文件选择框、拖进来、粘贴进来的 File 都登记成 blob: 地址，上传时凭地址取回原对象。
 * 上传用 XMLHttpRequest（fetch 拿不到上传进度）
 */

export type { PickedFile } from './filesTypes';

/** 浏览器里不直接拍摄（手机浏览器的相册选择框自带拍照） */
export const CAN_CAPTURE = false;

export class CameraDenied extends Error {}

const blobs = new Map<string, Blob>();

/** 读图片、视频的尺寸，读不出（格式不认识）就当普通文件 */
function measure(uri: string, kind: 'image' | 'video'): Promise<PickedFile['media']> {
  return new Promise((resolve) => {
    if (kind === 'image') {
      const img = new Image();
      img.onload = () => resolve({ kind, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(undefined);
      img.src = uri;
    } else {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve({ kind, width: video.videoWidth, height: video.videoHeight });
      video.onerror = () => resolve(undefined);
      video.src = uri;
    }
  });
}

/** 浏览器给的 File 登记成待发送的本地文件 */
export function fromBrowserFiles(files: readonly File[]): Promise<PickedFile[]> {
  return Promise.all(
    files.map(async (file) => {
      const uri = URL.createObjectURL(file);
      blobs.set(uri, file);
      const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
      const picked: PickedFile = {
        uri,
        name: file.name || 'file',
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
      };
      const media = kind ? await measure(uri, kind) : undefined;
      return media ? { ...picked, media } : picked;
    }),
  );
}

function choose(accept: string): Promise<PickedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = accept;
    input.onchange = () => resolve(fromBrowserFiles(Array.from(input.files ?? [])));
    input.oncancel = () => resolve([]);
    input.click();
  });
}

export const pickMedia = () => choose('image/*,video/*');
export const pickDocuments = () => choose('');
export const capture = (): Promise<PickedFile[]> => Promise.reject(new CameraDenied());

function blobOf(body: UploadBody): Blob {
  if (!('uri' in body)) return body.chunk as Blob;
  const blob = blobs.get(body.uri);
  if (!blob) throw new Error('File released');
  return blob;
}

/** md5 按 2MB 一段读，不把整个文件读进内存 */
const MD5_STEP = 2 * 1024 * 1024;

export const fileIO: FileIO = {
  async md5(file, signal) {
    const blob = blobOf(file);
    const spark = new SparkMD5.ArrayBuffer();
    for (let offset = 0; offset < blob.size && !signal.aborted; offset += MD5_STEP) {
      spark.append(await blob.slice(offset, offset + MD5_STEP).arrayBuffer());
    }
    return spark.end();
  },

  slice: async (file, offset, length) => ({
    part: { chunk: blobOf(file).slice(offset, offset + length) },
    dispose: () => {},
  }),

  post({ url, headers, fields, fieldName, body, signal, onProgress }) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      for (const [key, value] of Object.entries(fields)) form.append(key, value);
      form.append(fieldName, blobOf(body), 'uri' in body ? body.name : 'blob');
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) onProgress(Math.min(1, e.loaded / e.total));
      };
      xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.onabort = () => reject(new Error('Aborted'));
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
      xhr.send(form);
    });
  },

  release(file) {
    if (!blobs.delete(file.uri)) return;
    URL.revokeObjectURL(file.uri);
  },
};
