import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from './client';
import { ApiError } from './errors';
import { CHUNK_THRESHOLD, createUploader, type UploadIO } from './upload';

/** 假的服务端：JSON 接口走 fetch，multipart 走 io.post，都按路径应答 */
function setup(reply: (path: string, fields: Record<string, string>) => unknown) {
  const json: { path: string; body: Record<string, unknown> }[] = [];
  const posts: { path: string; fields: Record<string, string> }[] = [];
  const pathOf = (url: string) => url.replace('https://demo.example.com/api/', '').split('?')[0]!;
  const client = createApiClient({
    getServer: () => 'https://demo.example.com',
    getToken: () => 'tok',
    language: () => 'zh',
    version: '1.0.0',
    platform: 'web',
    fetch: (async (url: string, init: RequestInit) => {
      const path = pathOf(url);
      const body = JSON.parse(String(init.body));
      json.push({ path, body });
      return { json: async () => reply(path, body) } as Response;
    }) as unknown as typeof fetch,
  });
  const released: string[] = [];
  const io: UploadIO = {
    md5: async () => 'd41d8cd98f00b204e9800998ecf8427e',
    slice: async (_file, offset, length) => ({ part: { chunk: { offset, length } }, dispose: () => {} }),
    base64: async () => '',
    post: vi.fn(async ({ url, fields, onProgress }) => {
      const path = pathOf(url);
      posts.push({ path, fields });
      onProgress(1);
      const res = reply(path, fields);
      if (res instanceof Error) throw res;
      return { status: 200, body: JSON.stringify(res) };
    }),
    release: (file) => void released.push(file.uri),
  };
  return { uploader: createUploader(client, io), json, posts, released };
}

const ok = (data: unknown) => ({ ret: 1, msg: '', data });
const params = (size: number) => ({ file: { uri: 'file:///a.zip', name: 'a.zip', size, mimeType: 'application/zip' }, dialogId: 10, replyId: 0, key: 'k1', signal: new AbortController().signal, onProgress: vi.fn() });

describe('上传', () => {
  it('小文件整个传给 sendfile，成功后释放本地文件', async () => {
    const { uploader, posts, released } = setup(() => ok({ id: 1 }));
    expect(await uploader.send(params(100))).toEqual({ id: 1 });
    expect(posts).toEqual([{ path: 'dialog/msg/sendfile', fields: { dialog_id: '10', reply_id: '0', filename: 'a.zip' } }]);
    expect(released).toEqual(['file:///a.zip']);
  });

  it('大文件分片：跳过服务端已收的，网络错误重试，最后合并', async () => {
    let failOnce = true;
    const size = CHUNK_THRESHOLD + 10;
    const { uploader, json, posts } = setup((path, fields) => {
      if (path === 'upload/init') return ok({ upload_id: 'u1', chunk_size: CHUNK_THRESHOLD / 2, chunk_count: 3, received: [1] });
      if (path === 'upload/chunk' && fields.index === '2' && failOnce) {
        failOnce = false;
        return new Error('offline');
      }
      if (path === 'upload/merge') return ok({ id: 2 });
      return ok({});
    });
    vi.useFakeTimers();
    const p = params(size);
    const done = uploader.send(p);
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    expect(await done).toEqual({ id: 2 });
    expect(json[0]!.body).toMatchObject({ size, name: 'a.zip', scene: 'dialog_file', scene_params: { dialog_ids: [10], reply_id: 0, client_attempt: 'k1' } });
    expect(posts.map((c) => c.fields.index).sort()).toEqual(['0', '2', '2']);
    expect(json.at(-1)).toEqual({ path: 'upload/merge', body: { upload_id: 'u1' } });
    expect(p.onProgress).toHaveBeenLastCalledWith(0.95);
  });

  it('服务端拒绝不重试；放弃时清掉分片会话', async () => {
    const { uploader, json, posts } = setup((path) => {
      if (path === 'upload/init') return ok({ upload_id: 'u1', chunk_size: CHUNK_THRESHOLD, chunk_count: 2, received: [] });
      if (path === 'upload/chunk') return { ret: 0, msg: '空间不足', data: {} };
      return ok({});
    });
    await expect(uploader.send(params(CHUNK_THRESHOLD + 1))).rejects.toMatchObject(new ApiError('server', 0, '空间不足', {}));
    expect(posts).toHaveLength(2);
    uploader.forget('k1', params(0).file);
    await Promise.resolve();
    expect(json.at(-1)).toEqual({ path: 'upload/cancel', body: { upload_id: 'u1' } });
  });
});
