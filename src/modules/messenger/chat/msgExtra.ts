import type { Msg } from '../../../sync/api/dialog';

/** 消息里接口没有声明、显示和菜单要用的字段 */
export interface MsgExtra {
  percentage?: number;
  /** 标注人 */
  tag?: number;
  /** 设待办的人 */
  todo?: number;
  modify?: number;
}

export const msgExtra = (msg: Msg) => msg as Msg & MsgExtra;
