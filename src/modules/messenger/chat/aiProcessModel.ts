import { useEffect, useState } from 'react';

import type { useT } from '../../../i18n';
import type { AiBlock, AiRow } from '../../../sync/ai/timeline';
import type { BubbleTone } from './RichText';

export type T = ReturnType<typeof useT>;
export type ProcessBlock = Extract<AiBlock, { t: 'process' }>;

/** 发起人的操作：停止、确认、卡片动作；失败弹提示 */
export interface AiActions {
  stop: () => void;
  resume: (confirmId: string, approved: boolean) => Promise<void>;
  dismissCard: (cardId: string) => Promise<void>;
}

export interface AiCtx {
  t: T;
  tone: BubbleTone;
  mine: boolean;
  /** 没有消息 ID（如预览）时为空，只能看 */
  actions: AiActions | null;
  /** 展开 / 收起前调用 expectResize，展开状态变化的那次提交里调用 settleResize：高度变化保持顶部不动 */
  expectResize: () => void;
  settleResize: () => void;
}

/** 执行过程的滚动框：停在底部的判定余量 */
export const AT_END_SLOP = 8;

/** 进行中每秒走一次的耗时；没有开始时间时从第一次看到算起 */
export function useElapsed(live: boolean, startedAt: number): number {
  const [seen] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [live]);
  return now - (startedAt || seen);
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** 思考行叫「思考中 / 已思考」，工具行用工具名 */
export function rowTitle(row: AiRow, t: T): string {
  if (row.kind === 'reasoning') return t(row.state === 'running' ? 'messenger:ai.thinking' : 'messenger:ai.thought');
  return row.name;
}

/**
 * 执行过程组的标题：进行中「正在执行中 · 耗时」（不足 1 秒不显示耗时）；
 * 结束后多于 1 项或有失败时写工具执行次数，否则用 fallback
 */
export function processTitle(block: ProcessBlock, elapsed: number, t: T, fallback: string): string {
  if (block.live) return elapsed < 1000 ? t('messenger:ai.executing') : `${t('messenger:ai.executing')} · ${formatElapsed(elapsed)}`;
  if (block.toolCount > 0 && (block.items.length > 1 || block.failedCount > 0)) {
    return block.failedCount > 0
      ? t('messenger:ai.toolFailed', { n: block.toolCount, failed: block.failedCount })
      : t('messenger:ai.toolCount', { n: block.toolCount });
  }
  return fallback;
}
