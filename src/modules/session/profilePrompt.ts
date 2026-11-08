import { create } from 'zustand';

export type ProfileField = 'nickname' | 'tel';

interface ProfilePromptState {
  /** 正在等用户填的字段，null 为没有 */
  field: ProfileField | null;
  settle: ((filled: boolean) => void) | null;
}

/** 补填昵称 / 电话的弹窗状态，由 ProfilePrompt 渲染 */
export const useProfilePrompt = create<ProfilePromptState>()(() => ({ field: null, settle: null }));

let pending: { field: ProfileField; promise: Promise<void> } | null = null;

/**
 * 请求钩子 onNeedProfile：弹窗让用户补填，填好 resolve（原请求自动重试），取消 reject。
 * 几个请求同时要同一项只弹一次；要另一项的排在当前这次后面
 */
export function requestProfile(field: ProfileField): Promise<void> {
  if (pending?.field === field) return pending.promise;
  const before = pending?.promise.catch(() => {}) ?? Promise.resolve();
  const promise = before.then(
    () =>
      new Promise<void>((resolve, reject) => {
        useProfilePrompt.setState({
          field,
          settle: (filled) => {
            useProfilePrompt.setState({ field: null, settle: null });
            if (pending?.promise === promise) pending = null;
            if (filled) resolve();
            else reject(new Error(`${field} not filled`));
          },
        });
      }),
  );
  pending = { field, promise };
  return promise;
}
