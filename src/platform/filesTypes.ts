/**
 * 选文件、传文件的平台接口。形状和数据层的 LocalFile / UploadIO 一致（平台层不能引用数据层，接线处由类型检查对齐）
 */

/** 选好的本地文件；图片、视频带尺寸 */
export interface PickedFile {
  /** 原生是文件地址，Web 是 blob: 地址 */
  uri: string;
  name: string;
  /** 字节 */
  size: number;
  mimeType: string;
  media?: { kind: 'image' | 'video'; width: number; height: number };
}

/** 切出来的一片 */
export interface FileChunk {
  readonly chunk: unknown;
}

export type UploadBody = PickedFile | FileChunk;

export interface FileIO {
  md5(file: PickedFile, signal: AbortSignal): Promise<string>;
  slice(file: PickedFile, offset: number, length: number): Promise<{ part: FileChunk; dispose: () => void }>;
  post(request: {
    url: string;
    headers: Record<string, string>;
    fields: Record<string, string>;
    fieldName: string;
    body: UploadBody;
    mimeType: string;
    signal: AbortSignal;
    onProgress: (ratio: number) => void;
  }): Promise<{ status: number; body: string }>;
  /** 文件发完或放弃了，释放本地占用（Web 的 blob: 地址） */
  release(file: PickedFile): void;
}
