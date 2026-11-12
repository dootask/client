import { useSyncExternalStore } from 'react';

/**
 * 要打开的图片、视频：打开时放在这里，App 的查看页挂载时取走，网页的查看层直接订阅
 */

/** 一张图；id 是它所属的消息，有的才能转发 */
export interface PictureItem {
  url: string;
  id?: number;
}

export interface PictureRequest {
  kind: 'pictures';
  items: PictureItem[];
  position: number;
  /** 翻到最早一张时取更早的图（从早到晚）；返回空表示到头 */
  loadOlder?: () => Promise<PictureItem[]>;
  onForward?: (id: number) => void;
}

export interface VideoRequest {
  kind: 'video';
  url: string;
}

export type MediaRequest = PictureRequest | VideoRequest;

let current: MediaRequest | null = null;
const listeners = new Set<() => void>();

export function setMediaRequest(request: MediaRequest | null) {
  current = request;
  for (const listener of listeners) listener();
}

export const getMediaRequest = () => current;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export const useMediaRequest = () => useSyncExternalStore(subscribe, getMediaRequest);
