import type { ReactNode } from 'react';

export interface ReactionTipProps {
  /** 回应的人，按回应先后 */
  userids: readonly number[];
  /** 回应胶囊 */
  children: ReactNode;
}
