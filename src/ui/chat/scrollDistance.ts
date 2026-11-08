/**
 * column-reverse 滚动容器的位置记账，参考 happy-next 的 scrollDistanceController.ts。
 * 所有补偿都基于「上次让它停在哪」做加减，不从 DOM 读回来再算：
 * 浏览器会把 scrollTop 量化（小数、缩放屏），读回再算每次带进一点误差，多次补偿后内容会一像素一像素地漂。
 * 滚动事件报的位置和上次写的不一样，说明有人动了它（滚轮、触控板、拖滚动条、页内查找），从此以报告的为准
 */
export function createScrollDistance() {
  let element: HTMLElement | null = null;
  const getElement = () => element;
  // 上次滚动事件报的或写入后的位置；之前以元素自己的为准
  let last: number | null = null;
  // 浏览器没按要求存下的那次写入：要的值和实际存的值
  let intent: { requested: number; stored: number } | null = null;

  const read = () => {
    const el = getElement();
    return el ? Math.max(0, -el.scrollTop) : 0;
  };

  /** 本来想停的位置：补偿都从它算 */
  const get = () => {
    const base = last ?? read();
    return intent && intent.stored === base ? intent.requested : base;
  };

  const set = (distance: number) => {
    const el = getElement();
    if (!el) return;
    const target = Math.max(0, distance);
    // column-reverse：0 是内容底部，往上为负
    el.scrollTop = -target;
    const stored = read();
    last = stored;
    intent = stored === target ? null : { requested: target, stored };
  };

  /** 滚动事件：位置变了说明有人动了它，返回 moved */
  const noteScroll = () => {
    const reported = read();
    const moved = reported !== last;
    if (intent && intent.stored !== reported) intent = null;
    last = reported;
    return { distance: reported, moved };
  };

  /** 交给滚动容器的 ref */
  const attach = (el: HTMLElement | null) => {
    element = el;
  };

  return { attach, read, get, set, noteScroll };
}
