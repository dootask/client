/** 最近一次弹出菜单的气泡（只有 Web 用：BubbleTouch.web 记下，「选择复制」选中它的正文） */
let menuBubble: HTMLElement | null = null;

export function setMenuBubble(el: HTMLElement | null) {
  menuBubble = el;
}

/** 选中气泡正文的文字，等菜单层关掉后再选，否则关闭时焦点变化会清掉选区 */
export function selectMenuBubble() {
  const bubble = menuBubble;
  if (!bubble) return;
  requestAnimationFrame(() => {
    const content = bubble.querySelector('[data-testid="msg-content"]') ?? bubble;
    window.getSelection()?.selectAllChildren(content);
  });
}
