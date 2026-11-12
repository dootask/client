import type { MenuKey } from './messageMenu';

/**
 * App：菜单分三组（常用、处理这条消息、理解这条消息），上方另有表情条，所以没有「回应」；
 * 「选择文本」打开全屏页（selectText 为 null 时走 MenuHandlers.onSelectText）
 */
export const menuTraits: { layout: readonly (readonly MenuKey[])[]; selectText: (() => void) | null } = {
  layout: [
    ['fullChat', 'reply', 'forward', 'copy', 'selectText', 'save', 'share', 'selectMany'],
    ['edit', 'withdraw', 'pin', 'tag', 'todoDetail', 'todoCancel', 'todoSet', 'favorite'],
    ['translate', 'voice2text'],
  ],
  selectText: null,
};
