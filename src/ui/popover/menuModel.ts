import type { LucideIcon } from '../Icon';

/**
 * 菜单项用数据描述（architecture.md 第 7 节），同一份数据在 Web 上自绘、在 App 上交给系统菜单。
 * 图标只在自绘菜单里显示；系统菜单用系统样式，不带图标
 */
export interface MenuAction {
  label: string;
  icon?: LucideIcon;
  /** 有子菜单的项不需要 onSelect */
  onSelect?: () => void;
  disabled?: boolean;
  /** 打勾（单选、多选状态） */
  checked?: boolean;
  /** 危险操作，文字用危险色 */
  destructive?: boolean;
  /** 对应的快捷键（写法同 useShortcut），只在自绘菜单里靠右显示；快捷键本身由页面用 useShortcut 注册 */
  shortcut?: string;
  children?: readonly MenuEntry[];
}

export type MenuEntry = MenuAction | 'separator';

/** 菜单项可以是数组，也可以是打开时才计算的函数 */
export const resolveItems = (items: readonly MenuEntry[] | (() => readonly MenuEntry[])) => (typeof items === 'function' ? items() : items);

/** 分隔线切出来的一组 */
export type MenuSection = readonly MenuAction[];

/** 按分隔线切成组；首尾和连续的分隔线不产生空组 */
export function toSections(entries: readonly MenuEntry[]): MenuSection[] {
  const sections: MenuAction[][] = [[]];
  for (const entry of entries) {
    if (entry === 'separator') sections.push([]);
    else sections[sections.length - 1].push(entry);
  }
  return sections.filter((section) => section.length > 0);
}

/** 交给原生菜单的结构：只有可序列化的字段，回调按 id 留在 JS 这边 */
export interface NativeMenuItem {
  id: string;
  title: string;
  disabled: boolean;
  checked: boolean;
  destructive: boolean;
  /** 有值就是子菜单 */
  sections?: NativeMenuItem[][];
}

export function toNativeMenu(entries: readonly MenuEntry[]): { sections: NativeMenuItem[][]; handlers: Map<string, () => void> } {
  const handlers = new Map<string, () => void>();
  const convert = (list: readonly MenuEntry[], prefix: string): NativeMenuItem[][] =>
    toSections(list).map((section, s) =>
      section.map((item, i) => {
        const id = `${prefix}${s}.${i}`;
        if (item.onSelect) handlers.set(id, item.onSelect);
        return {
          id,
          title: item.label,
          disabled: item.disabled ?? false,
          checked: item.checked ?? false,
          destructive: item.destructive ?? false,
          ...(item.children ? { sections: convert(item.children, `${id}/`) } : {}),
        };
      }),
    );
  return { sections: convert(entries, ''), handlers };
}
