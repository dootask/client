import { useEffect, useEffectEvent } from 'react';

import { type Combo, formatCombo, hasCommandModifier, matchCombo, parseCombo } from './combo';
import type { ShortcutOptions } from './types';

interface Entry {
  combo: Combo;
  run: () => void;
}

/** 已注册的快捷键，后注册的在后面；同一组合以最后注册的为准 */
const entries: Entry[] = [];

const isMac = () => /mac|iphone|ipad/i.test(navigator.platform);

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}

function onKeyDown(event: KeyboardEvent) {
  // 输入法合成中的回车、方向键是在选字
  if (event.isComposing || event.keyCode === 229) return;
  // 弹出层、对话框打开时键盘归它们，页面上的快捷键暂停
  if (document.querySelector('[aria-modal="true"]')) return;
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (!matchCombo(entry.combo, event)) continue;
    // 正在输入框里打字时，不带 Ctrl / Alt / Command 的组合留给输入
    if (isEditable(event.target) && !hasCommandModifier(entry.combo)) return;
    event.preventDefault();
    entry.run();
    return;
  }
}

function register(entry: Entry): () => void {
  entries.push(entry);
  // 全页只挂一个监听，有快捷键时才挂。用捕获阶段：react-native-web 的输入框会拦住按键冒泡
  if (entries.length === 1) window.addEventListener('keydown', onKeyDown, true);
  return () => {
    entries.splice(entries.indexOf(entry), 1);
    if (entries.length === 0) window.removeEventListener('keydown', onKeyDown, true);
  };
}

/**
 * 注册键盘快捷键（Web / 桌面）。组件挂载期间有效，handler 总是用最新的，不会因为重渲染反复注册。
 * 写法见 combo.ts；同一组合以最后注册的为准；弹出层打开期间暂停；输入框里只响应带 Ctrl / Alt / Command 的组合
 */
export function useShortcut(combo: string, handler: () => void, { enabled = true }: ShortcutOptions = {}): void {
  const run = useEffectEvent(handler);
  useEffect(() => {
    if (!enabled) return;
    return register({ combo: parseCombo(combo, isMac()), run: () => run() });
  }, [combo, enabled]);
}

/** 快捷键的显示文字：Mac 上 `⇧⌘K`，其他系统 `Ctrl+Shift+K` */
export function shortcutLabel(combo: string): string {
  const mac = isMac();
  return formatCombo(parseCombo(combo, mac), mac);
}
