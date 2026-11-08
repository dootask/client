import type { SharedValue } from 'react-native-reanimated';
import type { ReactNode } from 'react';

/** 一条消息；data 由使用方定义，库只读 id、时间与作者 */
export interface ChatMessage<T = unknown> {
  id: string;
  /** 列表认行的键，默认 id。同一条消息换了 id（如发送中换成发出的消息）时沿用原来的键，行不重挂、进场动画不中断 */
  key?: string;
  /** 毫秒时间戳，用于日期分隔 */
  createdAt: number;
  authorId: string;
  data: T;
}

export interface MessageRenderInfo<T> {
  message: ChatMessage<T>;
  /** 时间上更早的相邻消息 */
  older?: ChatMessage<T>;
  /** 时间上更新的相邻消息 */
  newer?: ChatMessage<T>;
  isOwn: boolean;
}

export interface ScrollToBottomInfo {
  /** 离开底部后新到的消息数 */
  newCount: number;
}

export interface ScrollToMessageOptions {
  /** 默认带动画 */
  animated?: boolean;
  /** 闪烁高亮，默认是 */
  highlight?: boolean;
  /** 不传时目标滚到中间；传了则贴到顶端，上方留出这么多条消息 */
  above?: number;
}

export interface ChatViewProps<T> {
  /** 按时间倒序：下标 0 为最新 */
  messages: readonly ChatMessage<T>[];
  currentUserId: string;
  renderMessage: (info: MessageRenderInfo<T>) => ReactNode;
  /** 日期分隔，参数为该日第一条消息的时间戳 */
  renderDay?: (createdAt: number) => ReactNode;
  /** 盖在列表顶部的导航栏，列表内容从它下方滚过 */
  header?: ReactNode;
  /** 输入栏，内部用 ChatInput 作为输入框 */
  composer: ReactNode;
  /** 输入栏、面板及其下方安全区的底色 */
  bottomColor: string;
  /** 浮在列表底部、紧贴输入栏上方的内容（如 @ 候选），不占列表布局 */
  accessory?: ReactNode;
  /** 面板（表情、加号等），按名称打开 */
  panels?: Record<string, ReactNode>;
  /** 面板高度（不含底部安全区），不跟键盘一样高；与键盘互切时整体在两个高度间过渡 */
  panelHeight?: number;
  /** 个别面板用自己的高度（不含底部安全区），面板之间切换时高度过渡 */
  panelHeights?: Record<string, number>;
  /**
   * 下拉收键盘时手指到键盘上方多远就开始带动键盘，通常是单行输入栏的高度。
   * 要给定值：iOS 上它是挂在键盘上的透明附件的高度，跟着输入栏实时变会让键盘高度跟着变，输入框换行时整页晃一下
   */
  keyboardDragOffset: number;
  /** 回到底部按钮的外观；不传则不显示按钮 */
  renderScrollToBottom?: (info: ScrollToBottomInfo) => ReactNode;
  /** 叠在回到底部按钮上方的浮动内容（如跳到 @ 我的消息） */
  floating?: ReactNode;
  /** 为 true 时列表不能滚（如拖动勾选） */
  scrollLock?: SharedValue<boolean>;
  /** 可视区内的消息变化时调用（消息露出足够比例才算） */
  onVisibleChange?: (ids: string[]) => void;
  /** 跳转定位时目标行的闪烁底色（画在行内的 RowHighlight 里） */
  highlightColor: string;
  /** 为 true 时列表先不显示、改为居中显示加载提示（打开时定位到历史位置期间，免得先露出底部再跳走），变回 false 时淡入 */
  listHidden?: boolean;
  /** 加载中提示（顶部加载更早、底部加载更新时显示；没有消息时居中显示） */
  loadingIndicator?: ReactNode;
  /** 没有消息、也不在加载更早时居中显示的内容 */
  emptyContent?: ReactNode;
  hasEarlier?: boolean;
  loadingEarlier?: boolean;
  onLoadEarlier?: () => void;
  /** 当前数据不含最新消息（跳转到历史位置后） */
  hasNewer?: boolean;
  loadingNewer?: boolean;
  onLoadNewer?: () => void;
  /** hasNewer 时点回到底部：使用方换成最新一页后 resolve，库再滚到底 */
  onJumpToLatest?: () => Promise<void>;
}

export interface ChatViewHandle {
  scrollToBottom: () => void;
  /** 收起键盘和面板 */
  dismissInput: () => void;
  /** 滚到指定消息；消息尚未在 messages 中时，等它出现后再滚。定位完成（或被拖动取消）时 resolve */
  scrollToMessage: (id: string, options?: ScrollToMessageOptions) => Promise<void>;
}

/** 输入栏与面板按钮经 useChat() 拿到的控制接口 */
export interface ChatController {
  /** 目标面板：切回键盘时键盘一起步就变 null（面板内容留到键盘到位才撤），按钮图标跟它 */
  activePanel: string | null;
  /** 本输入框的键盘是否弹着（目标状态：开始收起即为 false）。不用焦点：系统返回键收起键盘后输入框仍是聚焦的 */
  keyboardShown: boolean;
  /** 打开面板；已打开同一个面板时切回键盘 */
  togglePanel: (name: string) => void;
  closePanel: () => void;
  focusInput: () => void;
  /** 收起键盘或面板；有东西被收起时返回 true（用于系统返回键） */
  dismiss: () => boolean;
}
