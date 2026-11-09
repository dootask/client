import { z } from 'zod';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * 发文件消息：小文件整个传给 `dialog/msg/sendfile`，不小于 10MB 的走分片接口
 * （`upload/init` → `upload/chunk` × N → `upload/merge`），同一文件发到同一目标时服务端续传已收的分片。
 * 读文件、切片、multipart 传输因平台而异，由上层注入 UploadIO
 */

/** 选好待发送的本地文件；图片、视频带尺寸，发送中占位用 */
export interface LocalFile {
  /** 本地地址：原生是文件地址，Web 是 blob: 地址 */
  uri: string;
  name: string;
  /** 字节 */
  size: number;
  mimeType: string;
  media?: { kind: 'image' | 'video'; width: number; height: number };
}

/** 切出来的一片，只有 UploadIO 自己认识 */
export interface UploadChunk {
  readonly chunk: unknown;
}

export interface UploadIO {
  /** 文件 md5（小写十六进制） */
  md5(file: LocalFile, signal: AbortSignal): Promise<string>;
  /** 切出 [offset, offset + length) 一片；用完调 dispose */
  slice(file: LocalFile, offset: number, length: number): Promise<{ part: UploadChunk; dispose: () => void }>;
  /** multipart POST；网络失败 reject，服务端的返回原样交回 */
  post(request: {
    url: string;
    headers: Record<string, string>;
    fields: Record<string, string>;
    fieldName: string;
    body: LocalFile | UploadChunk;
    mimeType: string;
    signal: AbortSignal;
    onProgress: (ratio: number) => void;
  }): Promise<{ status: number; body: string }>;
  /** 整个文件的 base64（不带 data: 前缀）；只用于语音这样的小文件 */
  base64(file: LocalFile): Promise<string>;
  /** 文件发完或放弃了，释放本地占用 */
  release(file: LocalFile): void;
}

/** 不小于这个字节数走分片（与旧前端一致） */
export const CHUNK_THRESHOLD = 10 * 1024 * 1024;
/** 单个文件上限（与旧前端一致：1024000 KB） */
export const FILE_MAX_SIZE = 1024000 * 1024;

const CHUNK_CONCURRENCY = 3;
const CHUNK_RETRIES = 3;
/** 分片传完后还要等服务端合并，进度留出最后一段 */
const CHUNK_PROGRESS_SHARE = 0.95;

const initSchema = z.looseObject({
  upload_id: z.string(),
  chunk_size: z.number(),
  chunk_count: z.number(),
  received: z.array(z.number()),
});

export class UploadCancelled extends Error {}

export interface UploadParams {
  file: LocalFile;
  dialogId: number;
  replyId: number;
  /** 本地 id：分片会话按它区分，放弃发送时凭它清掉 */
  key: string;
  signal: AbortSignal;
  onProgress: (ratio: number) => void;
}

export function createUploader(client: ApiClient, io: UploadIO) {
  /** 分片会话还留在服务端的：失败后留给重传续传，放弃发送时才通知服务端清掉 */
  const sessions = new Map<string, string>();

  async function post(path: string, request: Omit<Parameters<UploadIO['post']>[0], 'url' | 'headers'>): Promise<unknown> {
    const { url, headers } = client.endpoint(path);
    let res: { status: number; body: string };
    try {
      res = await io.post({ ...request, url, headers });
    } catch (err) {
      if (request.signal.aborted) throw new UploadCancelled();
      throw new ApiError('network', 0, err instanceof Error ? err.message : 'Upload failed', {});
    }
    return (await client.parse(path, res.status, res.body, headers['dootask-token']!)).data;
  }

  /** 网络问题退避重试（0.5s、1s、2s）；服务端拒绝、已取消时直接抛出 */
  async function withRetry<T>(run: () => Promise<T>, signal: AbortSignal): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await run();
      } catch (err) {
        if (attempt >= CHUNK_RETRIES || signal.aborted || !(err instanceof ApiError && err.kind === 'network')) throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }

  function whole({ file, dialogId, replyId, signal, onProgress }: UploadParams): Promise<unknown> {
    return post('dialog/msg/sendfile', {
      // 相册、相机给的文件名可能是随机的，显示名用原名
      fields: {
        dialog_id: String(dialogId),
        reply_id: String(replyId),
        filename: file.name,
      },
      fieldName: 'files',
      body: file,
      mimeType: file.mimeType,
      signal,
      onProgress,
    });
  }

  async function chunked({ file, dialogId, replyId, key, signal, onProgress }: UploadParams): Promise<unknown> {
    const hash = await io.md5(file, signal);
    if (signal.aborted) throw new UploadCancelled();
    const init = initSchema.parse(
      (
        await client.request('upload/init', {
          method: 'post',
          data: {
            hash,
            size: file.size,
            name: file.name,
            scene: 'dialog_file',
            // 带上本地 id：同一文件同时发两次各用各的会话，这条重传时仍能续传
            scene_params: {
              dialog_ids: [dialogId],
              reply_id: replyId,
              client_attempt: key,
            },
          },
        })
      ).data,
    );
    const { upload_id: uploadId, chunk_size: chunkSize, chunk_count: chunkCount, received } = init;
    sessions.set(key, uploadId);

    const lengthOf = (index: number) => Math.min(chunkSize, file.size - index * chunkSize);
    const done = new Set(received);
    const todo = Array.from({ length: chunkCount }, (_, i) => i).filter((i) => !done.has(i));
    const sent = new Map<number, number>(received.map((i) => [i, lengthOf(i)]));
    const report = () => onProgress(([...sent.values()].reduce((sum, v) => sum + v, 0) / file.size) * CHUNK_PROGRESS_SHARE);
    report();

    let failure: unknown = null;
    const worker = async () => {
      while (todo.length > 0 && failure === null && !signal.aborted) {
        const index = todo.shift()!;
        const length = lengthOf(index);
        try {
          const { part, dispose } = await io.slice(file, index * chunkSize, length);
          try {
            await withRetry(
              () =>
                post('upload/chunk', {
                  fields: { upload_id: uploadId, index: String(index) },
                  fieldName: 'blob',
                  body: part,
                  mimeType: 'application/octet-stream',
                  signal,
                  onProgress: (ratio) => {
                    sent.set(index, ratio * length);
                    report();
                  },
                }),
              signal,
            );
          } finally {
            dispose();
          }
          sent.set(index, length);
          report();
        } catch (err) {
          failure ??= err;
        }
      }
    };
    await Promise.all(Array.from({ length: CHUNK_CONCURRENCY }, worker));
    if (signal.aborted) throw new UploadCancelled();
    if (failure !== null) throw failure;

    const { data } = await client.request('upload/merge', {
      method: 'post',
      data: { upload_id: uploadId },
      timeout: 120000,
    });
    sessions.delete(key);
    return data;
  }

  return {
    /** 上传并发出文件消息，resolve 服务端返回的消息数据；取消时 reject UploadCancelled，失败抛 ApiError（失败的留着本地文件等重传） */
    async send(params: UploadParams): Promise<unknown> {
      const data = await (params.file.size >= CHUNK_THRESHOLD ? chunked(params) : whole(params));
      io.release(params.file);
      return data;
    },
    /** 放弃发送：释放本地文件，清掉服务端留着的分片会话 */
    forget(key: string, file: LocalFile) {
      io.release(file);
      const uploadId = sessions.get(key);
      if (!uploadId) return;
      sessions.delete(key);
      client
        .request('upload/cancel', {
          method: 'post',
          data: { upload_id: uploadId },
        })
        .catch(() => {});
    },
  };
}

export type Uploader = ReturnType<typeof createUploader>;
