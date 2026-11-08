import { useT } from '../../i18n';
import { useSplitView } from '../../ui/layout';
import { PlaceholderScreen } from '../../ui/PlaceholderScreen';
import { DialogList } from './DialogList';

/** 消息首页：窄屏是会话列表；并排视图里列表在左边，右边提示选一个会话 */
export function MessengerHome() {
  const t = useT();
  const split = useSplitView();
  if (!split) return <DialogList />;
  return <PlaceholderScreen title="" subtitle={t('messenger:pick')} />;
}
