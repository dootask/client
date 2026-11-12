import { selectMenuBubble } from './bubbleSelect';
import type { MenuKey } from './messageMenu';

/**
 * Web：同旧版网页右键菜单，一组平铺、顺序照旧版（DialogWrapper.vue 的 operate-action）；
 * 表情在菜单底部的表情行里。「选择复制」直接选中气泡里的文字
 */
export const menuTraits: { layout: readonly (readonly MenuKey[])[]; selectText: (() => void) | null } = {
  layout: [['reply', 'edit', 'voice2text', 'translate', 'copy', 'selectText', 'forward', 'selectMany', 'withdraw', 'tag', 'favorite', 'todoCancel', 'todoSet', 'pin', 'fullChat']],
  selectText: selectMenuBubble,
};
