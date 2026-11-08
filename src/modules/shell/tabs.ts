import { FolderKanban, LayoutDashboard, LayoutGrid, MessageCircle, Settings, UsersRound } from 'lucide-react-native';

import type { LucideIcon } from '../../ui/Icon';

export interface MainTab {
  /** 路由名，也是 (main) 下的文件名 */
  name: string;
  href: '/dashboard' | '/projects' | '/messenger' | '/contacts' | '/apps' | '/settings';
  label: 'shell:tab.dashboard' | 'shell:tab.project' | 'shell:tab.messenger' | 'shell:tab.contacts' | 'shell:tab.apps' | 'setting:title';
  icon: LucideIcon;
}

/** 主框架的五个 Tab，顺序同旧前端 */
export const MAIN_TABS: readonly MainTab[] = [
  { name: 'dashboard', href: '/dashboard', label: 'shell:tab.dashboard', icon: LayoutDashboard },
  { name: 'projects', href: '/projects', label: 'shell:tab.project', icon: FolderKanban },
  { name: 'messenger', href: '/messenger', label: 'shell:tab.messenger', icon: MessageCircle },
  { name: 'contacts', href: '/contacts', label: 'shell:tab.contacts', icon: UsersRound },
  { name: 'apps', href: '/apps', label: 'shell:tab.apps', icon: LayoutGrid },
];

/** 设置：侧栏底部的入口；窄屏从仪表盘的导航栏进入，不占底部 Tab */
export const SETTINGS_TAB: MainTab = { name: 'settings', href: '/settings', label: 'setting:title', icon: Settings };
