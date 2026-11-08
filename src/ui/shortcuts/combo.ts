/**
 * 快捷键组合的解析、匹配和显示，纯函数，不碰 DOM。
 *
 * 写法：修饰键在前、按键在后，用 `+` 连接，不区分大小写，如 `mod+k`、`mod+shift+enter`、`escape`、`alt+arrowup`。
 * - `mod`：Mac 上是 Command，其他系统是 Ctrl（同一份写法两边都顺手）
 * - `ctrl` / `alt` / `shift` / `meta`：就是对应的键
 * - 字母、数字按物理键位匹配（不受输入法、键盘布局影响）；其他键按 `KeyboardEvent.key` 匹配
 */

export interface Combo {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  /** 小写的按键名 */
  key: string;
}

/** 匹配时需要的按键事件字段（DOM KeyboardEvent 的子集，方便测试） */
export interface KeyInput {
  key: string;
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

const MODIFIERS = new Set(['mod', 'ctrl', 'alt', 'shift', 'meta']);

/** 解析组合写法；写错（没有按键、修饰键不认识、重复按键）直接抛错，写代码时就能发现 */
export function parseCombo(text: string, mac: boolean): Combo {
  const parts = text.toLowerCase().split('+');
  // `mod++` 这类写法里最后一个 `+` 是按键本身
  if (parts.length > 1 && parts[parts.length - 1] === '' && parts[parts.length - 2] === '') parts.splice(-2, 2, '+');
  const key = parts.pop();
  if (!key || MODIFIERS.has(key)) throw new Error(`快捷键缺少按键：${text}`);
  const combo: Combo = { ctrl: false, alt: false, shift: false, meta: false, key };
  for (const part of parts) {
    if (part === 'mod') combo[mac ? 'meta' : 'ctrl'] = true;
    else if (part === 'ctrl' || part === 'alt' || part === 'shift' || part === 'meta') combo[part] = true;
    else throw new Error(`快捷键里有不认识的修饰键：${text}`);
  }
  return combo;
}

/** 物理键位：字母 KeyA、数字 Digit1 */
function codeOf(key: string): string | null {
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  return null;
}

export function matchCombo(combo: Combo, event: KeyInput): boolean {
  if (event.ctrlKey !== combo.ctrl || event.altKey !== combo.alt || event.metaKey !== combo.meta || event.shiftKey !== combo.shift) return false;
  const code = codeOf(combo.key);
  return code ? event.code === code : event.key.toLowerCase() === combo.key;
}

/** 带 Ctrl / Alt / Command 的组合；输入框里只响应这类，避免和打字冲突 */
export function hasCommandModifier(combo: Combo): boolean {
  return combo.ctrl || combo.alt || combo.meta;
}

const MAC_KEY_LABELS: Record<string, string> = { enter: '↩', escape: '⎋', backspace: '⌫', delete: '⌦', tab: '⇥', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', ' ': 'Space' };
const KEY_LABELS: Record<string, string> = { enter: 'Enter', escape: 'Esc', backspace: 'Backspace', delete: 'Del', tab: 'Tab', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', ' ': 'Space' };

/** 给菜单、提示显示用：Mac 上 `⇧⌘K`，其他系统 `Ctrl+Shift+K` */
export function formatCombo(combo: Combo, mac: boolean): string {
  const labels = mac ? MAC_KEY_LABELS : KEY_LABELS;
  const key = labels[combo.key] ?? (combo.key.length === 1 ? combo.key.toUpperCase() : combo.key[0].toUpperCase() + combo.key.slice(1));
  if (mac) return `${combo.ctrl ? '⌃' : ''}${combo.alt ? '⌥' : ''}${combo.shift ? '⇧' : ''}${combo.meta ? '⌘' : ''}${key}`;
  return [combo.ctrl && 'Ctrl', combo.alt && 'Alt', combo.shift && 'Shift', combo.meta && 'Win', key].filter(Boolean).join('+');
}
