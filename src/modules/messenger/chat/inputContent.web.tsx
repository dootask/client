import type { ReactNode } from 'react';

import type { ComposeValue } from '../../../sync/messenger';

/** Web：输入框只能放纯文字，mention 不高亮；删到 mention 时整段删除由 applyTextChange 回写 */
export function inputContent(value: ComposeValue): { value?: string; children?: ReactNode } {
  return { value: value.text };
}
