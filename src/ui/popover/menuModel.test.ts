import { describe, expect, it, vi } from 'vitest';

import { type MenuEntry, toNativeMenu, toSections } from './menuModel';

describe('menuModel', () => {
  it('按分隔线分组，忽略首尾和连续的分隔线', () => {
    const a = { label: 'a' };
    const b = { label: 'b' };
    const c = { label: 'c' };
    expect(toSections(['separator', a, 'separator', 'separator', b, c, 'separator'])).toEqual([[a], [b, c]]);
    expect(toSections([])).toEqual([]);
  });

  it('转成原生菜单结构，回调按 id 留在 JS，子菜单递归', () => {
    const copy = vi.fn();
    const zh = vi.fn();
    const entries: MenuEntry[] = [
      { label: '复制', onSelect: copy, checked: true },
      'separator',
      { label: '语言', children: [{ label: '中文', onSelect: zh }, 'separator', { label: 'English', disabled: true }] },
      { label: '删除', destructive: true },
    ];
    const { sections, handlers } = toNativeMenu(entries);
    expect(sections).toEqual([
      [{ id: '0.0', title: '复制', disabled: false, checked: true, destructive: false }],
      [
        {
          id: '1.0',
          title: '语言',
          disabled: false,
          checked: false,
          destructive: false,
          sections: [
            [{ id: '1.0/0.0', title: '中文', disabled: false, checked: false, destructive: false }],
            [{ id: '1.0/1.0', title: 'English', disabled: true, checked: false, destructive: false }],
          ],
        },
        { id: '1.1', title: '删除', disabled: false, checked: false, destructive: true },
      ],
    ]);
    handlers.get('1.0/0.0')?.();
    expect(zh).toHaveBeenCalledOnce();
    expect([...handlers.keys()]).toEqual(['0.0', '1.0/0.0']);
  });
});
