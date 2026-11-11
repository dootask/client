import { joinNames, useLanguage, useT } from '../../../i18n';
import { Tooltip } from '../../../ui/popover';
import { useNicknames } from '../hooks';
import type { ReactionTipProps } from './reactionTipTypes';

/** 提示里最多列出几个人，其余显示「+N位」 */
const MAX_NAMES = 10;

/** Web：悬停回应胶囊显示回应的人 */
export function ReactionTip({ userids, children }: ReactionTipProps) {
  const t = useT();
  const language = useLanguage();
  // 还没取回昵称的人也算进「+N位」
  const names = useNicknames(userids.slice(0, MAX_NAMES)).filter(Boolean);
  const rest = userids.length - names.length;
  if (!names.length) return children;
  return <Tooltip label={joinNames(names, language, rest > 0 ? t('messenger:reaction.more', { n: rest }) : undefined)}>{children}</Tooltip>;
}
