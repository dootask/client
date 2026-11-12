import { setMediaRequest, type MediaRequest } from './request';

/** 打开图片或视频：网页在当前页上盖一层（MediaHost） */
export const openMedia = (request: MediaRequest) => setMediaRequest(request);

export const closeMedia = () => setMediaRequest(null);
