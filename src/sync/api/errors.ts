/**
 * 错误分类，界面层按 kind 翻译提示语（sync 层不碰 i18n）：
 * - network：没拿到服务端响应（断网、超时、DNS 失败），可提示重试
 * - invalid：拿到了响应但格式不对，或 zod 校验不通过
 * - server：服务端返回 ret !== 1，message 是服务端按 language 请求头翻译好的提示，可能为空
 * - no-server：还没配置服务器地址
 */
export type ApiErrorKind = 'network' | 'invalid' | 'server' | 'no-server';

export class ApiError<T = unknown> extends Error {
  readonly kind: ApiErrorKind;
  /** 服务端返回码；kind 不是 server 时为 0 */
  readonly ret: number;
  readonly data: T;

  constructor(kind: ApiErrorKind, ret: number, message: string, data: T) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.ret = ret;
    this.data = data;
  }
}

/** 服务端约定的特殊返回码（见旧前端 store/actions.js 的 call） */
export const RET = {
  SUCCESS: 1,
  /** 身份丢失，需要重新登录 */
  AUTH_LOST: -1,
  /** 需要先设置昵称 */
  NEED_NICKNAME: -2,
  /** 需要先设置联系电话 */
  NEED_TEL: -3,
  /** 项目不存在或无权访问，data.project_id */
  PROJECT_GONE: -4001,
  /** 任务不存在或无权访问，data.task_id，data.force === 1 时为归档相关 */
  TASK_GONE: -4002,
  /** 会话不存在或无权访问，data.dialog_id */
  DIALOG_GONE: -4003,
  /** 子任务变更，需重新拉取父任务，data.task_id */
  TASK_PARENT_STALE: -4004,
} as const;
