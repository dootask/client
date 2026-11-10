/** 输入框里没有候选时的快捷键（D17）：返回 true 表示处理了，不再交给输入框 */
export interface ComposerKeys {
  /** Esc：取消回复 / 编辑 */
  escape: () => boolean;
  /** ↑：输入框空着时编辑自己的上一条 */
  up: () => boolean;
}
