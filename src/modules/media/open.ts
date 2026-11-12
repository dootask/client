import { router } from 'expo-router';

import { setMediaRequest, type MediaRequest } from './request';

/** 打开图片或视频：App 推出全屏的查看页（透明模态，下拉时露出下层页面） */
export function openMedia(request: MediaRequest) {
  setMediaRequest(request);
  router.push('/media-preview');
}

export function closeMedia() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
