import 'i18next';

import type { sourceResources } from './resources';

// 键和参数由 TS 检查：写错键编译不过
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof sourceResources;
  }
}
