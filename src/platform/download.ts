import { Directory, File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useSyncExternalStore } from 'react';

/**
 * 原生端的下载：消息里的文件、图片、视频下到缓存，再用系统打开、存相册或交给系统分享
 */

/** 没给相册权限 */
export class AlbumDenied extends Error {}

/** 文件名里不能出现的字符 */
const UNSAFE_NAME = /[\\/:*?"<>|]/g;

/** 进行中的下载：进度 0–1（服务器没给大小时为 0），可取消 */
const downloads = new Map<string, { progress: number; abort: AbortController }>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** 这个键的下载进度（0–1）；没在下载时为 null。只有在下载的那条随进度重新渲染 */
export function useDownloadProgress(key: number | string): number | null {
  return useSyncExternalStore(subscribe, () => downloads.get(String(key))?.progress ?? null);
}

/** 取消这个键进行中的下载，有在下载的才返回 true */
export function cancelDownload(key: number | string): boolean {
  const task = downloads.get(String(key));
  task?.abort.abort();
  return !!task;
}

/** 取消导致的失败（不用提示） */
export function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * 下载到缓存（按消息分目录；不属于消息的用别的键）；name 为空时取地址里的文件名。
 * 先下到临时文件，完整下完才改成正式文件名；reuse 时缓存里已有就直接用（消息里的文件不会变），否则重新下载覆盖。
 * size 为预期大小，服务器没给长度时用来算进度；同一个键同时只下一份
 */
export async function downloadToCache(key: number | string, url: string, name?: string, options: { size?: number; reuse?: boolean } = {}): Promise<File> {
  const id = String(key);
  const dir = new Directory(Paths.cache, 'dialog-files', id);
  dir.create({ idempotent: true, intermediates: true });
  const fileName = (name || decodeURIComponent(url.split('?')[0].split('/').pop() || '') || id).replace(UNSAFE_NAME, '_');
  const target = new File(dir, fileName);
  if (options.reuse && target.exists) return target;
  cancelDownload(id);
  const task = { progress: 0, abort: new AbortController() };
  downloads.set(id, task);
  notify();
  try {
    const part = await File.downloadFileAsync(url, new File(dir, `${fileName}.part`), {
      idempotent: true,
      signal: task.abort.signal,
      onProgress: ({ bytesWritten, totalBytes }) => {
        const total = totalBytes > 0 ? totalBytes : (options.size ?? 0);
        task.progress = total > 0 ? Math.min(1, bytesWritten / total) : 0;
        notify();
      },
    });
    if (target.exists) target.delete();
    part.move(target);
    return new File(dir, fileName);
  } finally {
    if (downloads.get(id) === task) {
      downloads.delete(id);
      notify();
    }
  }
}

/** 用系统打开：iOS 为 QuickLook，Android 交给能打开它的应用；没有能打开的应用时走系统分享 */
export async function openWithSystem(key: number | string, url: string, name: string, size: number): Promise<void> {
  const file = await downloadToCache(key, url, name, { size, reuse: true });
  if (await file.canPreview().catch(() => false)) await file.preview();
  else await Sharing.shareAsync(file.uri);
}

/** 图片、视频存到系统相册；没给权限时 reject AlbumDenied */
export async function saveToAlbum(key: number | string, url: string): Promise<void> {
  const permission = await requestPermissionsAsync(true);
  if (!permission.granted) throw new AlbumDenied();
  const file = await downloadToCache(key, url);
  await Asset.create(file.uri);
}

/** 交给系统分享（iOS 可「存储到文件」）；用户取消不算失败 */
export async function shareFile(key: number | string, url: string, name?: string, size?: number): Promise<void> {
  const file = await downloadToCache(key, url, name, { size, reuse: !!size });
  await Sharing.shareAsync(file.uri);
}
