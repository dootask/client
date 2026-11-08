import auth from '../../locales/zh/auth.json';
import common from '../../locales/zh/common.json';
import setting from '../../locales/zh/setting.json';
import shell from '../../locales/zh/shell.json';

/**
 * 源语言（简体中文）的全部命名空间，打进主包：既是回退语言，也是键的类型来源。
 * 新增命名空间：在 locales/<语言>/ 下各加一个 JSON，再登记到这里
 */
export const sourceResources = { common, auth, setting, shell };

export type Namespace = keyof typeof sourceResources;

export const NAMESPACES = ['common', 'auth', 'setting', 'shell'] as const satisfies readonly Namespace[];
