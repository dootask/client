/** 转发弹层（两端各自实现：Web 一页里勾选会话加选项，App 是旧版 App 的选会话加「确认转发」） */
export interface ForwardSheetProps {
  msgIds: readonly number[];
  /**
   * 合并转发：Web 上是「合并转发」勾选项的默认值（不传为勾上）；
   * App 上为 true 时是合并转发（多选里的「合并转发」），否则逐条转发
   */
  defaultMerge?: boolean;
  visible: boolean;
  onClose: () => void;
  onSent?: () => void;
}
