import { describe, expect, it } from 'vitest';

import { formatCombo, hasCommandModifier, type KeyInput, matchCombo, parseCombo } from './combo';

const key = (init: Partial<KeyInput>): KeyInput => ({ key: '', code: '', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...init });

describe('parseCombo', () => {
  it('mod 在 Mac 上是 Command，其他系统是 Ctrl', () => {
    expect(parseCombo('mod+k', true)).toMatchObject({ meta: true, ctrl: false, key: 'k' });
    expect(parseCombo('Mod+K', false)).toMatchObject({ meta: false, ctrl: true, key: 'k' });
  });

  it('按键可以是 +', () => {
    expect(parseCombo('mod++', false)).toMatchObject({ ctrl: true, key: '+' });
  });

  it('写错直接抛错', () => {
    expect(() => parseCombo('mod+shift', false)).toThrow();
    expect(() => parseCombo('cmd+k', false)).toThrow();
    expect(() => parseCombo('', false)).toThrow();
  });
});

describe('matchCombo', () => {
  it('字母按物理键位匹配，不受输入法和布局影响', () => {
    const combo = parseCombo('mod+k', false);
    expect(matchCombo(combo, key({ key: 'k', code: 'KeyK', ctrlKey: true }))).toBe(true);
    // 俄文布局下同一个键 key 是 'л'
    expect(matchCombo(combo, key({ key: 'л', code: 'KeyK', ctrlKey: true }))).toBe(true);
    expect(matchCombo(combo, key({ key: 'k', code: 'KeyK' }))).toBe(false);
  });

  it('修饰键要完全一致', () => {
    const combo = parseCombo('mod+k', true);
    expect(matchCombo(combo, key({ key: 'k', code: 'KeyK', metaKey: true, shiftKey: true }))).toBe(false);
    expect(matchCombo(combo, key({ key: 'k', code: 'KeyK', ctrlKey: true }))).toBe(false);
  });

  it('其他键按 key 匹配', () => {
    expect(matchCombo(parseCombo('escape', false), key({ key: 'Escape', code: 'Escape' }))).toBe(true);
    expect(matchCombo(parseCombo('alt+arrowup', false), key({ key: 'ArrowUp', code: 'ArrowUp', altKey: true }))).toBe(true);
  });
});

describe('hasCommandModifier', () => {
  it('Shift 不算，Ctrl / Alt / Command 算', () => {
    expect(hasCommandModifier(parseCombo('shift+a', false))).toBe(false);
    expect(hasCommandModifier(parseCombo('escape', false))).toBe(false);
    expect(hasCommandModifier(parseCombo('alt+a', false))).toBe(true);
    expect(hasCommandModifier(parseCombo('mod+a', true))).toBe(true);
  });
});

describe('formatCombo', () => {
  it('Mac 用符号，其他系统用文字', () => {
    expect(formatCombo(parseCombo('mod+shift+k', true), true)).toBe('⇧⌘K');
    expect(formatCombo(parseCombo('mod+shift+k', false), false)).toBe('Ctrl+Shift+K');
    expect(formatCombo(parseCombo('mod+enter', true), true)).toBe('⌘↩');
    expect(formatCombo(parseCombo('escape', false), false)).toBe('Esc');
    expect(formatCombo(parseCombo('f2', false), false)).toBe('F2');
  });
});
