import type { TooltipProps } from './types';

/** App 上不显示悬停提示 */
export function Tooltip({ children }: TooltipProps) {
  return children;
}

export function TooltipHost() {
  return null;
}
