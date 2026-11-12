/** 转发弹层（两端各自实现：Web 是旧版网页的选择成员弹窗加「确认转发」，App 是旧版 App 的选会话加「确认转发」） */
export interface ForwardSheetProps {
  /** 消息所在会话（确认转发里预览消息用） */
  dialogId: number;
  msgIds: readonly number[];
  /** 多选进来的：Web 的确认转发里有「逐条 / 合并」单选和预览（App 不用） */
  multi?: boolean;
  /** 合并转发：App 上为 true 时直接合并转发，Web 上是「合并转发」单选的初始值；都默认逐条 */
  defaultMerge?: boolean;
  visible: boolean;
  onClose: () => void;
  onSent?: () => void;
}
