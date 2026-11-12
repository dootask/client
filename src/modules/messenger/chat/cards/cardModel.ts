import type { Translate } from '../../../../i18n';
import type { MergeTitle, MsgBody } from '../../../../sync/messenger/body';

/** 卡片类消息体（各端 CardBody 画） */
export type CardMsgBody = Extract<MsgBody, { kind: 'vote' | 'wordChain' | 'location' | 'meeting' | 'mergeForward' | 'template' }>;

/** 合并转发的标题（同旧版 getMergeForwardTitle）：没有发送人时「聊天记录」，一人、两人、两人以上各一种说法 */
export function mergeTitleText({ names, total }: MergeTitle, t: Translate): string {
  const [a, b] = names;
  if (a === undefined) return t('messenger:forward.records');
  if (b === undefined) return t('messenger:forward.titleOne', { a });
  return t(total > 2 ? 'messenger:forward.titleMany' : 'messenger:forward.titleTwo', { a, b });
}

/** 会议频道 ID 按 3 3 5 分段，方便念给别人（同旧版） */
export const channelId = (id: string) => id.replace(/^(.{3})(.{3})(.*)$/, '$1 $2 $3');

/** 接龙名单超过多少条（连同示例）时收起，收起时前面留几条（同旧版网页） */
export const CHAIN_FOLD = 4;
export const CHAIN_FOLD_SHOW = 2;
